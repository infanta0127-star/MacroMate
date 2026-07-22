const fs = require('fs');

async function fetchSkills() {
  const res = await fetch('https://www.ffxiv.com.tw/web/intro/guide/battle/');
  const text = await res.text();
  
  // Look for skills in the text. Let's try to find how jobs and skills are formatted.
  // FFXIV usually puts skills in list items or tables. Let's just dump the text or a specific section.
  fs.writeFileSync('page.html', text);
  console.log('Saved to page.html');
}

fetchSkills();
