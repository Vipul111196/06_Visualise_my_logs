const express = require('express');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const chokidar = require('chokidar');

const app = express();
const PORT = 3001;

// Serve static files
app.use(express.static(__dirname));

// Get logs directory path (current directory)
const LOGS_DIR = __dirname;

// API to get list of log files
app.get('/api/logs', (req, res) => {
  try {
    const files = fs.readdirSync(LOGS_DIR)
      .filter(file => file.endsWith('.log') || file.endsWith('.txt'))
      .map(file => {
        const filePath = path.join(LOGS_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime,
          sizeFormatted: formatBytes(stats.size)
        };
      })
      .sort((a, b) => b.modified - a.modified);
    
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API to get log content with advanced filtering
app.get('/api/logs/:filename', (req, res) => {
  const filename = req.params.filename;
  const lines = parseInt(req.query.lines) || 1000;
  const search = req.query.search || '';
  const logLevel = req.query.level || '';
  const regex = req.query.regex || '';
  const isRegexEnabled = req.query.isRegex === 'true';
  const context = req.query.context || '';
  const severity = req.query.severity || '';
  
  console.log('Filter parameters:', {
    search, logLevel, context, severity, regex
  });
  
  try {
    const filePath = path.join(LOGS_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const allLines = content.split('\n');

    // Keep track of original line numbers for accurate display
    let filteredLines = allLines.map((line, index) => ({ line, lineNumber: index + 1 }));
    
    // Apply search filter
    if (search) {
      if (isRegexEnabled) {
        try {
          const searchRegex = new RegExp(search, 'i');
          filteredLines = filteredLines.filter(item => searchRegex.test(item.line));
        } catch (e) {
          // If regex is invalid, fall back to normal search
          filteredLines = filteredLines.filter(item =>
            item.line.toLowerCase().includes(search.toLowerCase())
          );
        }
      } else {
        filteredLines = filteredLines.filter(item =>
          item.line.toLowerCase().includes(search.toLowerCase())
        );
      }
    }
    
    // Apply log level filter
    if (logLevel) {
      const levelPattern = new RegExp(`\\[${logLevel}\\]`, 'i');
      filteredLines = filteredLines.filter(item => levelPattern.test(item.line));
    }
    
    // Apply context filter
    if (context) {
      const contextLower = context.toLowerCase();
      
      filteredLines = filteredLines.filter(item => {
        const lineLower = item.line.toLowerCase();
        
        // Try multiple matching strategies
        const jsonContextMatch = new RegExp(`"context":"[^"]*${context}[^"]*"`, 'i').test(item.line);
        const simpleTextMatch = lineLower.includes(contextLower);
        const wordBoundaryMatch = new RegExp(`\\b${context}`, 'i').test(item.line);
        
        return jsonContextMatch || simpleTextMatch || wordBoundaryMatch;
      });
    }
    
    // Apply severity filter (error, warn, info, debug)
    if (severity) {
      const severityLevels = severity.split(',').map(s => s.trim().toLowerCase());
      
      filteredLines = filteredLines.filter(item => {
        const lineLevel = classifyLogLevel(item.line).toLowerCase();
        return severityLevels.includes(lineLevel);
      });
    }
    

    
    // Apply regex filter
    if (regex && !isRegexEnabled) {
      try {
        const regexPattern = new RegExp(regex, 'i');
        filteredLines = filteredLines.filter(item => regexPattern.test(item.line));
      } catch (e) {
        // If regex is invalid, ignore this filter
      }
    }
    

    
    const filteredCount = filteredLines.length;
    const limitedLines = filteredLines.slice(-lines);

    // Add log level classification to each remaining line
    const classifiedLines = limitedLines.map(({ line, lineNumber }) => {
      const level = classifyLogLevel(line);
      const contextVal = extractContext(line);
      const timestampVal = extractTimestamp(line);

      return {
        content: line,
        level: level,
        timestamp: timestampVal,
        context: contextVal,
        lineNumber: lineNumber
      };
    });
    
    res.json({
      lines: classifiedLines,
      totalLines: allLines.length,
      filteredLines: filteredCount,
      filename: filename,
      appliedFilters: {
        search: search || null,
        logLevel: logLevel || null,
        context: context || null,
        severity: severity || null,
        regex: regex || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`📊 NestJS Log Viewer running at http://localhost:${PORT}`);
  console.log(`📁 Watching logs directory: ${LOGS_DIR}`);
});

// WebSocket for real-time updates
const wss = new WebSocket.Server({ server });

// Watch for file changes
const watcher = chokidar.watch(path.join(LOGS_DIR, '*.{log,txt}'));

watcher.on('change', (filePath) => {
  const filename = path.basename(filePath);
  console.log(`📝 Log file changed: ${filename}`);
  
  // Broadcast to all connected clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'fileChanged',
        filename: filename,
        timestamp: new Date().toISOString()
      }));
    }
  });
});

wss.on('connection', (ws) => {
  console.log('👤 Client connected');
  
  ws.on('close', () => {
    console.log('👤 Client disconnected');
  });
});

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper function to classify log level
function classifyLogLevel(line) {
  const cleanLine = stripAnsiCodes(line);
  
  // Check for bracketed log levels first (most common format)
  if (cleanLine.match(/\[debug\]/i)) return 'debug';
  if (cleanLine.match(/\[info\]/i)) return 'info';
  if (cleanLine.match(/\[warn\]/i)) return 'warn';
  if (cleanLine.match(/\[error\]/i)) return 'error';
  
  // Check for uppercase log levels
  if (cleanLine.match(/\bDEBUG\b/i)) return 'debug';
  if (cleanLine.match(/\bINFO\b/i)) return 'info';
  if (cleanLine.match(/\bWARN\b/i)) return 'warn';
  if (cleanLine.match(/\bERROR\b/i)) return 'error';
  
  // Check for specific error patterns
  if (cleanLine.match(/error|exception|failed|failure/i)) return 'error';
  if (cleanLine.match(/warning|deprecated/i)) return 'warn';
  
  // Special cases
  if (cleanLine.match(/TS\d+:/)) return 'typescript';
  if (cleanLine.match(/Found \d+ errors/)) return 'compilation';
  
  return 'info'; // Default to info instead of unknown
}

// Helper function to extract timestamp
function extractTimestamp(line) {
  const cleanLine = stripAnsiCodes(line);
  
  // Match ISO timestamp format: 2025-06-02T00:32:28.186Z
  const isoMatch = cleanLine.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
  if (isoMatch) return isoMatch[1];
  
  // Match time format: [2:29:14 am]
  const timeMatch = cleanLine.match(/\[(\d{1,2}:\d{2}:\d{2} [ap]m)\]/);
  if (timeMatch) return timeMatch[1];
  
  return null;
}

// Helper function to extract context
function extractContext(line) {
  const cleanLine = stripAnsiCodes(line);
  const contextMatch = cleanLine.match(/"context":"([^"]+)"/);
  return contextMatch ? contextMatch[1] : null;
}

// Helper function to strip ANSI color codes
function stripAnsiCodes(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
} 