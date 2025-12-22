const { main } = require('./scraper');
const express = require('express');
const pool = require('./db');
//const { scrapeSkinByName } = require('./scrape_single');
const app = express();
app.use(express.json());
main();

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.get('/skins/:skinName', async (req, res) => {
  const rows = await getSkins(req.params.skinName);
  const skin = mapSkin(rows);

  if (!skin) {
    return res.status(404).json({ message: 'Skin not found' });
  }

  res.json(skin);
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});

async function getSkins(skinName) {
  const query = `
    SELECT
      l.*,
      s.*,
      se.*
    FROM links l
    JOIN skins s ON s.skin_name = l.name
    LEFT JOIN seeds se ON se.skin_name = s.skin_name
    WHERE s.skin_name = $1
    ORDER BY se.seed_count
  `;

  const { rows } = await pool.query(query, [skinName]);
  return rows;
}

function mapSkin(rows) {
  if (rows.length === 0) return null;

  const skin = {
    name: rows[0].name,
    link: rows[0].link,

    skin_name: rows[0].skin_name,
    img: rows[0].img,
    pattern: rows[0].pattern,
    img_style: rows[0].img_style,
    paint_style: rows[0].paint_style,
    pattern_scale: rows[0].pattern_scale,
    weapon_length: rows[0].weapon_length,
    weapon_uv_scale: rows[0].weapon_uv_scale,
    collection_img: rows[0].collection_img,
    collection_name: rows[0].collection_name,
    steam_market_listings: rows[0].steam_market_listings,

    seeds: [],
  };

  for (const row of rows) {
    if (row.seed_count !== null) {
      skin.seeds.push({
        img: row.img,
        seed_count: row.seed_count,
        offset_x: row.offset_x,
        offset_y: row.offset_y,
        rotation: row.rotation,
        any_blue: row.any_blue,
        blue_gem_top: row.blue_gem_top,
        blue_gem_magazine: row.blue_gem_magazine,
        blue_gem: row.blue_gem,
      });
    }
  }

  return skin;
}
