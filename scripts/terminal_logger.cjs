const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/log') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const { message, type, timestamp } = JSON.parse(body);
        const time = new Date(timestamp).toLocaleTimeString();
        const color = type === 'error' ? '\x1b[31m' : type === 'warn' ? '\x1b[33m' : '\x1b[36m';
        const reset = '\x1b[0m';
        
        console.log(`[${time}] ${color}${type.toUpperCase()}${reset}: ${message}`);
        res.writeHead(200);
        res.end('OK');
      } catch (e) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Terminal Log Server running on http://localhost:${PORT}`);
});
