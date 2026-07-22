const https = require('https');
const fs = require('fs');

const jobs = [
  "paladin", "warrior", "darkknight", "gunbreaker",
  "whitemage", "scholar", "astrologian", "sage",
  "monk", "dragoon", "ninja", "samurai", "reaper", "viper",
  "bard", "machinist", "dancer",
  "blackmage", "summoner", "redmage", "pictomancer"
];

const data = JSON.parse(fs.readFileSync('src/data/jobSkills.json', 'utf-8'));

function fetchPage(job) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.ffxiv.com.tw/web/intro/guide/battle/${job}/`, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => resolve(html));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  for (const job of jobs) {
    try {
      const html = await fetchPage(job);
      const skillsMap = new Map();
      
      const regex = /data-tooltip="([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/g;
      let match;
      while ((match = regex.exec(html)) !== null) {
        let skillName = match[1].trim();
        let iconSrc = match[2].trim();
        
        if (!skillName || skillName === "null" || skillName.includes('<') || skillName.includes('等級') || skillName.includes('class=')) continue;
        
        let fullIconUrl = iconSrc.startsWith('http') 
            ? iconSrc 
            : iconSrc.startsWith('/') 
                ? `https://www.ffxiv.com.tw${iconSrc}` 
                : `https://www.ffxiv.com.tw/web/intro/guide/battle/${job}/${iconSrc}`;
        
        if (!skillsMap.has(skillName)) {
            skillsMap.set(skillName, fullIconUrl);
        }
      }
      
      if (data[job]) {
        data[job].skills = Array.from(skillsMap.entries()).map(([name, icon]) => ({ name, icon }));
        console.log(`Scraped ${job}: ${skillsMap.size} skills with icons.`);
      }
    } catch (e) {
      console.error(e);
    }
  }
  fs.writeFileSync('src/data/jobSkills.json', JSON.stringify(data, null, 2));
}
run();
