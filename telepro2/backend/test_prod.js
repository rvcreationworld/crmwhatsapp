const http = require('http');
http.get('http://crmpro.shareshaala.com/api/callpulse/admin/logs?limit=1', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
