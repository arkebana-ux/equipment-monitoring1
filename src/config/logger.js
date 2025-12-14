const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
const logFile = path.join(logDir, 'app.log');

function write(level, message) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  fs.appendFile(logFile, line, () => {});
  console.log(line.trim());
}

module.exports = {
  info: (msg) => write('INFO', msg),
  error: (msg) => write('ERROR', msg),
  http: (msg) => write('HTTP', msg)
};
