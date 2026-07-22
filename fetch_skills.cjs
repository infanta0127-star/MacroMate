const fs = require('fs');
const https = require('https');

https.get('https://www.ffxiv.com.tw/web/intro/guide/battle/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('page.html', data);
    console.log('Saved to page.html');
  });
});
