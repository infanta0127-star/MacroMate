const https = require('https');
const fs = require('fs');
const path = require('path');

const jobs = [
  "paladin", "warrior", "darkknight", "gunbreaker",
  "whitemage", "scholar", "astrologian", "sage",
  "monk", "dragoon", "ninja", "samurai", "reaper", "viper",
  "bard", "machinist", "dancer",
  "blackmage", "summoner", "redmage", "pictomancer", "bluemage"
];

const dataPath = path.join(__dirname, 'src/data/jobSkills.json');
let jobSkillsData = {};

if (fs.existsSync(dataPath)) {
  jobSkillsData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

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
  console.log("Scraping skill details...");
  for (const job of jobs) {
    try {
      console.log(`Fetching ${job}...`);
      const html = await fetchPage(job);
      const skills = [];
      
      const regexTr = /<tr[^>]*id="((?:pve|role)_action__\d+)"[^>]*>([\s\S]*?)<\/tr>/g;
      let match;
      
      while ((match = regexTr.exec(html)) !== null) {
        const trId = match[1];
        const trContent = match[2];
        
        // Extract name
        const nameMatch = trContent.match(/<td class="skill">[\s\S]*?<p><strong>([\s\S]*?)<\/strong><\/p>/);
        if (!nameMatch) continue;
        const name = nameMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (name.includes('等級') || name.includes('class=')) continue;
        
        // Extract icon
        const iconMatch = trContent.match(/<div class="job__skill_icon">[\s\S]*?<img[^>]*src="([^"]+)"/);
        let icon = iconMatch ? iconMatch[1].trim() : '';
        if (icon && !icon.startsWith('http')) {
          icon = icon.startsWith('/')
            ? `https://www.ffxiv.com.tw${icon}`
            : `https://www.ffxiv.com.tw/web/intro/guide/battle/${job}/${icon}`;
        }
        
        // Extract classification
        const classMatch = trContent.match(/<td class="classification">([^<]*)<\/td>/);
        const classification = classMatch ? classMatch[1].trim() : '';
        
        // Extract level
        const levelMatch = trContent.match(/<td class="jobclass">[\s\S]*?<p>([^<]*)<\/p>/);
        const level = levelMatch ? levelMatch[1].trim() : '';
        
        // Extract cast
        const castMatch = trContent.match(/<td class="cast">([^<]*)<\/td>/);
        const cast = castMatch ? castMatch[1].trim() : '';
        
        // Extract recast
        const recastMatch = trContent.match(/<td class="recast">([^<]*)<\/td>/);
        const recast = recastMatch ? recastMatch[1].trim() : '';
        
        // Extract cost
        const costMatch = trContent.match(/<td class="cost">([^<]*)<\/td>/);
        const cost = costMatch ? costMatch[1].trim() : '';
        
        // Extract distant_range
        const distMatch = trContent.match(/<td class="distant_range">([\s\S]*?)<\/td>/);
        let distantRange = '';
        if (distMatch) {
          distantRange = distMatch[1]
            .replace(/<br\s*\/?>/gi, ' / ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        // Extract description
        const descMatch = trContent.match(/<div class="content__info">([\s\S]*?)<\/div>/);
        let description = '';
        if (descMatch) {
          description = descMatch[1]
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\r/g, '')
            .replace(/\n\s+/g, '\n')
            .trim();
        }
        
        // Avoid duplicate skill names in the same job
        if (skills.some(s => s.name === name)) continue;
        
        skills.push({
          name,
          icon,
          classification,
          level,
          cast,
          recast,
          cost,
          distantRange,
          description
        });
      }
      
      if (!jobSkillsData[job]) {
        jobSkillsData[job] = { name: job, skills: [] };
      }
      jobSkillsData[job].skills = skills;
      console.log(`Scraped ${job}: ${skills.length} skills with details.`);
    } catch (e) {
      console.error(`Error scraping ${job}:`, e);
    }
  }
  
  fs.writeFileSync(dataPath, JSON.stringify(jobSkillsData, null, 2));
  console.log("Saved all detailed skill info to src/data/jobSkills.json");
}

run();
