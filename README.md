# 🚀 NestJS Log Viewer

A modern, web-based log viewer specifically designed for NestJS applications. This tool provides real-time log monitoring, search capabilities, and a beautiful interface to make reading large log files painless.

## ✨ Features

- 📊 **Web-based Interface** - Access from any browser
- 🔍 **Real-time Search** - Find specific log entries instantly
- 🎨 **Color-coded Log Levels** - Error, Warning, Info, Debug visualization
- 📜 **Auto-scroll** - Follow logs in real-time
- 📁 **Multiple Log Files** - Switch between different log files
- ⚡ **Real-time Updates** - WebSocket connection for live updates
- 🎯 **Smart Filtering** - Pagination and line limiting
- 💾 **Large File Support** - Handle multi-GB log files efficiently

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Your NestJS log files in the `../logs/` directory

### Installation

1. **Install Dependencies**
   ```bash
   cd pimp-my-log
   npm install
   ```

2. **Start the Log Viewer**
   ```bash
   npm start
   ```

3. **Open in Browser**
   ```
   http://localhost:3001
   ```

## 📖 Usage Guide

### Interface Overview

1. **Header**: Shows connection status and title
2. **Controls**: 
   - **Log File Selector**: Choose which log file to view
   - **Search Box**: Filter logs by text content
   - **Lines Selector**: Limit number of lines displayed (100-10,000)
   - **Refresh Button**: Manually refresh the current log
   - **Auto Scroll**: Toggle automatic scrolling to new entries

3. **Status Bar**: Shows current file info and statistics
4. **Log Display**: Color-coded log entries with hover effects

### Log Level Colors

- 🔴 **Red**: Error messages
- 🟡 **Yellow**: Warning messages  
- 🔵 **Blue**: Info messages
- 🟢 **Green**: Debug messages

### Keyboard Shortcuts

- **Ctrl+F**: Focus search box
- **F5**: Refresh current log
- **End**: Scroll to bottom (when not auto-scrolling)

### Search Tips

- Search is case-insensitive
- Use partial matches for broader results
- Search results are highlighted in yellow
- Filtered line count is shown in the status bar

## 🔧 Configuration

### Custom Port
Edit `server.js` and change the `PORT` variable:
```javascript
const PORT = 3001; // Change to your preferred port
```

### Log Directory
By default, it looks for logs in `../logs/`. To change this, edit `server.js`:
```javascript
const LOGS_DIR = path.join(__dirname, '..', 'your-logs-directory');
```

### Supported File Extensions
Currently supports `.log` and `.txt` files. To add more extensions, modify the filter in `server.js`:
```javascript
.filter(file => file.endsWith('.log') || file.endsWith('.txt') || file.endsWith('.your-extension'))
```

## 🛠️ Troubleshooting

### Common Issues

1. **"No logs found"**
   - Check if log files exist in the `../logs/` directory
   - Verify file permissions
   - Ensure files have `.log` or `.txt` extensions

2. **Connection issues**
   - Make sure port 3001 is available
   - Check firewall settings
   - Try a different port in the configuration

3. **Large file performance**
   - Reduce the number of lines displayed
   - Use search to filter results
   - Consider log rotation for very large files

### Log File Requirements

- Files should be text-based
- UTF-8 encoding recommended
- Line-based format (each log entry on a new line)

## 🎯 Advanced Features

### Real-time Monitoring
The log viewer uses WebSocket connections to detect file changes and automatically refresh the display when your NestJS application writes new log entries.

### Memory Efficient
Instead of loading entire log files into memory, the viewer reads files in chunks and displays only the requested number of lines, making it suitable for very large log files.

### Multi-file Support
Easily switch between different log files using the dropdown selector. The viewer automatically detects all `.log` and `.txt` files in your logs directory.

## 🔒 Security Notes

- This tool is intended for development and debugging
- Do not expose this service to the public internet
- Run only on trusted networks
- Consider adding authentication for production environments

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

This project is open source and available under the MIT License.

---

**Happy Logging!** 🎉 