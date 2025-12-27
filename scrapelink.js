const pool = require('./db');
const fetchWithRotatingProxies = require('./rotator');
const cheerio = require('cheerio');

async function getGeneral(url) {
  if (!url) {
    console.log('Invalid url');
    return;
  }

  const data = await fetchWithRotatingProxies(url);
  const $ = cheerio.load(data);

  const inserts = [];

  $('.card-title').each((_, el) => {
    const name = $(el).text().trim();
    const href = $(el).closest('a.text-link').attr('href');
    if (name && href)
      inserts.push({ name, link: `https://pattern.wiki${href}` });
  });

  scrapedAny = true;

  for (const skin of inserts) {
    try {
      await pool.query(
        `INSERT INTO links(name, link)
           VALUES ($1, $2)
           ON CONFLICT (name) DO NOTHING`,
        [skin.name, skin.link]
      );
    } catch (err) {
      console.log(`❌ DB error for ${skin.name}:`, err.message);
    }
  }

  console.log(`Scraping for ${inserts.name} successfully done`);
}
module.exports = getGeneral;
