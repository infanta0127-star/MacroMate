const fs = require('fs');

const data = JSON.parse(fs.readFileSync('src/data/jobSkills.json', 'utf-8'));

for (const job in data) {
  let name = data[job].name;
  // Extract just the Chinese characters and parenthesis part
  const match = name.match(/[\u4e00-\u9fa5（）]+(?=［)?/);
  if (match) {
    name = match[0];
  }
  data[job].name = name;
  
  // Also filter out junk skills
  data[job].skills = data[job].skills.filter(s => s && s.length < 20 && !s.includes('<') && !s.includes('class='));
}

// Ensure Blue Mage has some skills or just remove it if 0
if (data['bluemage'] && data['bluemage'].skills.length === 0) {
    delete data['bluemage'];
}

fs.writeFileSync('src/data/jobSkills.json', JSON.stringify(data, null, 2));
console.log("Fixed names");
