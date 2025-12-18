const fetchWithRotatingProxies = require('./rotator');
const cheerio = require('cheerio');
const pool = require('./db');

async function getAll() {
  let page = 1;
  let scrapedAny = false;

  while (true) {
    const url = `https://pattern.wiki/skins/?page=${page}&pattern=a&u=x&u=y&u=r&r=c&r=uc&r=r&r=m&r=l&r=a&r=s&r=i&cn=None`;
    console.log(`Scraping page ${page}...`);

    let data = null;

    while (!data) {
      data = await fetchWithRotatingProxies(url);
      if (!data) {
        console.log(`❌ All proxies failed for page ${page}, retrying...`);
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    const $ = cheerio.load(data);

    const activePage = Number($('.pagination .page-item.active').text().trim());

    if (activePage && activePage !== page) {
      console.log(
        `Requested page ${page}, but server returned page ${activePage}. Stopping.`
      );
      break;
    }

    const inserts = [];

    $('.card-title').each((_, el) => {
      const name = $(el).text().trim();
      const href = $(el).closest('a.text-link').attr('href');
      if (name && href)
        inserts.push({ name, link: `https://pattern.wiki${href}` });
    });

    if (inserts.length === 0) {
      console.log(`⚠️ No real links found on page ${page}, stopping.`);
      break;
    }

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

    console.log(`✅ Page ${page} scraped: ${inserts.length} links`);
    page++;
  }

  console.log(
    scrapedAny
      ? '✅ Some pages were successfully scraped.'
      : '⚠️ No pages were scraped.'
  );
}

async function getInfo() {
  try {
    const res = await pool.query(`
    SELECT name, link FROM links
    `);
    const links = res.rows;

    for (const row of links) {
      const data = await fetchWithRotatingProxies(row.link);
      const $ = cheerio.load(data);
      const skinName = row.name;
      const img = $('.img-fluid.slider-preview.seed-list-image.w-100').attr(
        'src'
      );
      const pattern = $('p:contains("Pattern:")')
        .text()
        .replace('Pattern:', '')
        .trim();
      const img_style = $('.card-img-top').attr('src');
      const paintStyle = $('p:contains("Paint Style")')
        .text()
        .replace('Paint Style:', '')
        .trim();
      const patternScale = parseFloat(
        $('p:contains("Pattern Scale")')
          .text()
          .replace('Pattern Scale:', '')
          .trim()
      );
      const weaponLength = parseFloat(
        $('p:contains("Weapon Length")')
          .text()
          .replace('Weapon Length:', '')
          .trim()
      );
      const weaponUvScale = parseFloat(
        $('p:contains("Weapon UV Scale")')
          .text()
          .replace('Weapon UV Scale:', '')
      );

      const collection_img = [];
      const collection_name = [];
      $('.img-sm').each((i, el) => {
        collection_img.push($(el).attr('src'));
        const name = $(el).attr('alt');
        if (name) collection_name.push(name.trim());
      });

      let steam_market_listings = {};

      $('.tab-content .tab-pane').each((i, el) => {
        const tabName = $(el).attr('id'); // normal, stattrak, etc.
        steam_market_listings[tabName] = [];

        $(el)
          .find('a.list-group-item')
          .each((j, item) => {
            const conditionText = $(item)
              .find('.fw-bold')
              .contents()
              .get(0)
              .nodeValue.trim(); // "Factory New", "Minimal Wear", etc.
            const countText = $(item).find('.fw-bold span.badge').text().trim(); // "22", "68", etc.
            const priceText = $(item)
              .contents()
              .filter((i, el) => el.type === 'text')
              .text()
              .trim(); // "$512.04"

            const count = parseInt(countText, 10) || 0;
            const price = parseFloat(priceText.replace('$', '')) || 0;

            steam_market_listings[tabName].push({
              condition: conditionText,
              count,
              price,
            });
          });
      });

      const updatedText = $('.badge.rounded-pill.bg-dark').text().trim();

      const parseUpdatedAt = (text) => {
        const now = new Date();

        const matchYears = text.match(/(\d+)\s+years?/);
        const matchMonths = text.match(/(\d+)\s+months?/);
        const matchDays = text.match(/(\d+)\s+days?/);

        let date = new Date(now);

        if (matchYears)
          date.setFullYear(date.getFullYear() - parseInt(matchYears[1]));
        if (matchMonths)
          date.setMonth(date.getMonth() - parseInt(matchMonths[1]));
        if (matchDays) date.setDate(date.getDate() - parseInt(matchDays[1]));

        return date;
      };

      const updatedAt = parseUpdatedAt(updatedText);

      await pool.query(
        `
  INSERT INTO allSkins(
          skin_name, img, pattern, img_style, paint_style, pattern_scale,
          weapon_length, weapon_uv_scale, collection_img, collection_name, steam_market_listings, updated_at
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (skin_name) 
        DO UPDATE SET
         img = EXCLUDED.img,
         pattern = EXCLUDED.pattern,
         img_style = EXCLUDED.img_style,
         paint_style = EXCLUDED.paint_style,
         pattern_scale = EXCLUDED.pattern_scale,
         weapon_length = EXCLUDED.weapon_length,
         weapon_uv_scale = EXCLUDED.weapon_uv_scale,
         collection_img = EXCLUDED.collection_img,
         collection_name = EXCLUDED.collection_name,
         steam_market_listings = EXCLUDED.steam_market_listings,
         updated_at = EXCLUDED.updated_at;

  `,
        [
          skinName,
          img,
          pattern,
          img_style,
          paintStyle,
          patternScale,
          weaponLength,
          weaponUvScale,
          collection_img,
          collection_name,
          steam_market_listings,
          updatedAt,
        ]
      );
      console.log(`Saved: ${skinName}`);

      await getSeeds(row.link, skinName);
    }
    console.log('Done!');
  } catch (err) {
    console.log(err);
  }
}

async function getSeeds(baseUrl, name) {
  let page = 1;

  while (true) {
    const url = `${baseUrl}?page=${page}`;
    const data = await fetchWithRotatingProxies(url);
    const $ = cheerio.load(data);

    const activeText = $('.pagination .page-item.active').text().trim();
    if (activeText) {
      const activePage = Number(activeText);
      if (activePage !== page) break;
    }

    const title = $('.card-title').text().trim();
    if (!title) break;

    const seedMatch = title.match(/\d+/);
    if (!seedMatch) break;
    const seed_count = Number(seedMatch[0]);

    const getNum = (label) => {
      const match = $(`li:contains("${label}")`)
        .text()
        .match(/[0-9.]+/);
      return match ? Number(match[0]) : null;
    };

    await pool.query(
      `
      INSERT INTO seed_s (
        skin_name, seed_count,
        offset_x, offset_y,
        rotation, any_blue,
        blue_gem_top, blue_gem_magazine, blue_gem
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (skin_name, seed_count) 
      DO UPDATE SET
      seed_count = EXCLUDED.seed_count,
      offset_x = EXCLUDED.offset_x,
      offset_y = EXCLUDED.offset_y,
      rotation = EXCLUDED.rotation,
      any_blue = EXCLUDED.any_blue,
      blue_gem_top = EXCLUDED.blue_gem_top,
      blue_gem_magazine = EXCLUDED.blue_gem_magazine,
      blue_gem = EXCLUDED.blue_gem;
      `,
      [
        name,
        seed_count,
        getNum('Offset X'),
        getNum('Offset Y'),
        getNum('Rotation'),
        getNum('Any Blue'),
        getNum('Blue Gem Top'),
        getNum('Blue Gem Magazine'),
        getNum('Blue Gem'),
      ]
    );

    console.log(`✅ Seeds page ${page} saved for ${name}`);
    page++;
  }

  console.log(`Finished seeds for ${name}`);
}

async function main() {
  await getAll();
  await getInfo();
}

module.exports = main;
