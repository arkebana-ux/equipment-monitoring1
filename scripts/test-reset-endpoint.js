const http = require('http');
const data = JSON.stringify({ email: '1group14d@gmail.com' });
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/auth/forgot-password/start',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log('BODY', body);
  });
});

req.on('error', (e) => console.error('ERROR', e.message));
req.write(data);
req.end();
