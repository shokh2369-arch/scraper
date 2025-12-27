const main = require('./scraper');
const express = require('express');
const pool = require('./db');
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
      s.*,
      l.link,
      COALESCE(l.name, s.skin_name) AS display_name
    FROM skins s
    LEFT JOIN links l ON (
      l.name = s.skin_name OR
      REPLACE(l.name, ' ', ' | ') = s.skin_name OR
      REPLACE(s.skin_name, ' | ', ' ') = l.name
    )
    WHERE s.skin_name = $1
  `;

  const skinResult = await pool.query(query, [skinName]);
  if (skinResult.rowCount === 0) return [];

  const baseSkin = skinResult.rows[0];

  // Separately fetch seeds
  const seedsQuery = `
    SELECT * FROM seeds 
    WHERE skin_name = $1 
    ORDER BY seed_count ASC
  `;
  const seedsResult = await pool.query(seedsQuery, [skinName]);

  return {
    base: baseSkin,
    seeds: seedsResult.rows,
  };
}

function mapSkin(data) {
  if (!data || data.base === undefined) return null;

  const { base, seeds } = data;

  return {
    name: base.display_name || base.skin_name,
    link: base.link || null,

    skin_name: base.skin_name,
    img: base.img,
    pattern: base.pattern,
    img_style: base.img_style,
    paint_style: base.paint_style,
    pattern_scale: base.pattern_scale,
    weapon_length: base.weapon_length,
    weapon_uv_scale: base.weapon_uv_scale,
    collection_img: base.collection_img,
    collection_name: base.collection_name,
    steam_market_listings: base.steam_market_listings,
    updated_at: base.updated_at,

    seeds: seeds.map((seed) => ({
      img: seed.img,
      seed_count: seed.seed_count,
      offset_x: seed.offset_x,
      offset_y: seed.offset_y,
      rotation: seed.rotation,
      any_blue: seed.any_blue,
      blue_gem_top: seed.blue_gem_top,
      blue_gem_magazine: seed.blue_gem_magazine,
      blue_gem: seed.blue_gem,
    })),
  };
}
