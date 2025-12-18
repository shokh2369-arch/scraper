const main = require('./scraper');
const express = require('express');
const pool = require('./db');
const app = express();

main();

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});

app.get('/skins/:skinName', async (req, res) => {
  try {
    const { skinName } = req.params;

    const data = await getSkins(skinName);

    if (data.length === 0) {
      return res.status(404).json({ message: 'Skin not found' });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

async function getSkins(skinName) {
  const query = `
    SELECT
      l.*,
      s.*,
      se.*
    FROM links l
    JOIN allSkins s ON s.skin_name = l.name
    LEFT JOIN seed_s se ON se.skin_name = s.skin_name
    WHERE s.skin_name = $1;
  `;

  const { rows } = await pool.query(query, [skinName]);
  return rows;
}
