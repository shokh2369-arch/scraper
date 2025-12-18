const main = require('./scraper');
const express = require('express');
const app = express();
app.use(express.json());

main();

class Body {
  constructor({ name }) {
    this.name = name;
  }

  async getByName() {
    const query = `
      SELECT allSkins.*, seed_s.*
      FROM allSkins
      JOIN seed_s
      ON allSkins.skin_name = seed_s.skin_name
      WHERE allSkins.skin_name = $1;
    `;

    try {
      const res = await pool.query(query, [this.name]);
      return res.rows;
    } catch (err) {
      console.error('Error executing query', err);
      throw err;
    }
  }
}

app.post('/get-skin', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });

  try {
    const body = new Body({ name });
    const data = await body.getByName();
    res.json(data); // return DB query results
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
