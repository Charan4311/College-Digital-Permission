const fs = require('fs');
const FormData = require('form-data');
const http = require('http');

const token = process.argv[2];
const form = new FormData();
form.append('file', fs.createReadStream('test.png'));

const request = http.request({
  method: 'POST',
  host: 'localhost',
  port: 5000,
  path: '/api/outpass/upload',
  headers: {
    'Authorization': `Bearer ${token}`,
    ...form.getHeaders()
  }
});

form.pipe(request);

request.on('response', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
    
    // Now try fetching it
    const data = JSON.parse(body);
    const url = data.data.fileUrl;
    
    http.get(`http://localhost:5000${url}`, (res2) => {
        console.log('GET URL Status:', res2.statusCode);
    });
  });
});
