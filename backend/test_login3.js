const http = require('http');

const data = JSON.stringify({
  username: 'CK@2025',
  password: 'CK' // Try to guess or just let it fail
});

const req = http.request({
  hostname: 'localhost',
  port: 5055,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  console.log(`Status: ${res.statusCode}`);
  let out = '';
  res.on('data', d => out += d);
  res.on('end', () => console.log(out));
});

req.on('error', console.error);
req.write(data);
req.end();
