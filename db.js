const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

async function page() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS links(
    name TEXT PRIMARY KEY,
    link TEXT,
    UNIQUE(link)
    )
    `);
  console.log('Table named page has been successfully created');
}
page();

async function individual() {
  await pool.query(`
       CREATE TABLE IF NOT EXISTS allSkins(
    skin_name TEXT PRIMARY KEY REFERENCES links(name) ON DELETE CASCADE,
    img TEXT,
    pattern TEXT,
    img_style TEXT,
    paint_style TEXT,
    pattern_scale NUMERIC,
    weapon_length NUMERIC,
    weapon_uv_scale NUMERIC,
    collection_img TEXT[],
    collection_name TEXT[],
    steam_market_listings JSONB,
    createdAt TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
); 
`);
  console.log('Table named individual has been successfully created');
}

individual();

async function seed() {
  await pool.query(`
  CREATE TABLE IF NOT EXISTS seed_s (
  skin_name TEXT NOT NULL,
  seed_count INT NOT NULL,
  offset_x NUMERIC,
  offset_y NUMERIC,
  rotation NUMERIC,
  any_blue NUMERIC,
  blue_gem_top NUMERIC,
  blue_gem_magazine NUMERIC,
  blue_gem NUMERIC,
  UNIQUE (skin_name, seed_count)
);

  `);
  console.log('Table named seeds has been successfully created');
}

seed();

module.exports = pool;
