const https = require('https');
const fs = require('fs');

const jobs = [
  "paladin", "warrior", "darkknight", "gunbreaker",
  "whitemage", "scholar", "astrologian", "sage",
  "monk", "dragoon", "ninja", "samurai", "reaper", "viper",
  "bard", "machinist", "dancer",
  "blackmage", "summoner", "redmage", "pictomancer", "bluemage"
];

const jobNames = {};
const jobSkills = {};

function fetchPage(job) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.ffxiv.com.tw/web/intro/guide/battle/${job}/`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  console.log("Scraping jobs...");
  
  // Also get the translated job names from the index page
  const indexHtml = fs.readFileSync('page.html', 'utf-8');
  // <a href="astrologian/">...占星術師...</a>
  for (const job of jobs) {
    const regex = new RegExp(`href="${job}/".*?>.*?([^<]+)\\s*<span`, 's');
    const match = indexHtml.match(regex);
    if (match) {
      let name = match[1].trim();
      name = name.replace(/<img[^>]+>/, '').trim();
      jobNames[job] = name;
    } else {
      jobNames[job] = job;
    }
  }

  for (const job of jobs) {
    try {
      const html = await fetchPage(job);
      const skills = new Set();
      
      // Match data-tooltip="Skill Name"
      const regex = /data-tooltip="([^"]+)"/g;
      let match;
      while ((match = regex.exec(html)) !== null) {
        let skillName = match[1].trim();
        if (skillName && skillName !== "null" && !skillName.includes('<') && !skillName.includes('等級')) {
            skills.add(skillName);
        }
      }
      
      jobSkills[job] = {
        name: jobNames[job],
        skills: Array.from(skills)
      };
      console.log(`Scraped ${job}: ${jobNames[job]} - ${skills.size} skills`);
    } catch (err) {
      console.error(`Error on ${job}:`, err);
    }
  }
  
  fs.writeFileSync('src/data/jobSkills.json', JSON.stringify(jobSkills, null, 2));
  console.log("Saved to src/data/jobSkills.json");
}

run();
