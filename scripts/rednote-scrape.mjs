import { chromium } from 'playwright';
import { randomInt } from 'crypto';
import { writeFileSync } from 'fs';

// ── Config ──────────────────────────────────────────────
const MAX_NOTES = 50;
const CDP_PORT = 9222;

// ── Helpers ─────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rand = (lo, hi) => randomInt(lo, hi);

async function humanScroll(page, totalPx) {
  let scrolled = 0;
  while (scrolled < totalPx) {
    const chunk = rand(60, 200);
    await page.mouse.wheel(rand(-2, 2), chunk);
    scrolled += chunk;
    await sleep(rand(30, 120));
  }
}

// ── Main ────────────────────────────────────────────────
(async () => {
  console.log('Connecting to Chrome…');
  const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
  console.log('Connected!\n');

  const context = browser.contexts()[0];
  const pages = context.pages();
  let page = pages.find(p => p.url().includes('search_result') || p.url().includes('rednote'));
  if (!page) page = pages[0];

  // Navigate to correct search URL (fix double-encoding issues)
  const searchQueries = [
    '西雅图象拔蚌',   // Seattle geoduck
    '西雅图赶海',     // Seattle tide pooling
    '西雅图挖蚌',     // Seattle clam digging
    '西雅图生蚝',     // Seattle oyster
    '西雅图挖蛤蜊',   // Seattle clam
  ];

  let allNoteLinks = []; // collected across all search queries
  const seenHrefs = new Set();

  for (const keyword of searchQueries) {
    const encoded = encodeURIComponent(keyword);
    const searchUrl = `https://www.rednote.com/search_result?keyword=${encoded}&source=web_explore_feed&type=51`;
    console.log(`\n🔍 Searching: "${keyword}"`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await sleep(rand(3000, 5000));

    // Dismiss popups
    await page.keyboard.press('Escape');
    await sleep(300);

    // Scroll to load results
    for (let i = 0; i < 15; i++) {
      await humanScroll(page, rand(300, 600));
      await sleep(rand(500, 1200));
    }

    // Collect note links from this search
    const links = await page.evaluate(() => {
      const results = [];
      const allLinks = document.querySelectorAll('a[href]');
      for (const a of allLinks) {
        const href = a.href || '';
        if (href.includes('/search_result/')) {
          const titleEl = a.querySelector('[class*="title"], span, p');
          const title = titleEl?.textContent?.trim()?.slice(0, 80) || '';
          results.push({ href, title });
        }
      }
      return results;
    });

    let newCount = 0;
    for (const l of links) {
      if (!seenHrefs.has(l.href)) {
        seenHrefs.add(l.href);
        allNoteLinks.push(l);
        newCount++;
      }
    }
    console.log(`   Found ${links.length} notes, ${newCount} new (total: ${allNoteLinks.length})`);

    if (allNoteLinks.length >= MAX_NOTES) break;
  }

  console.log(`\nTotal unique notes: ${allNoteLinks.length} (visiting up to ${MAX_NOTES})`);

  // ── Phase 3: Visit notes ──────────────────────────────
  const toVisit = allNoteLinks.slice(0, MAX_NOTES);
  const collected = [];
  let geoduckBeaches = new Map(); // beach name -> [{ post, details }]

  for (let i = 0; i < toVisit.length; i++) {
    const link = toVisit[i];
    const notePage = await context.newPage();

    try {
      await notePage.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 12000 });
      await sleep(rand(1500, 2500));

      // Dismiss popups
      await notePage.keyboard.press('Escape');
      await sleep(200);

      // Quick check if content loaded
      const hasContent = await notePage.evaluate(() => !!document.querySelector('.note-content, .desc, .note-text'));
      if (!hasContent) {
        console.log(`[${i + 1}/${toVisit.length}] BLOCKED: ${link.title || '(untitled)'}`);
        await notePage.close();
        continue;
      }

      // Brief human-like reading (scroll through post)
      for (let s = 0; s < rand(2, 4); s++) {
        await humanScroll(notePage, rand(150, 350));
        await sleep(rand(300, 700));
      }

      // Scroll down to load comments (5 passes — enough for most notes)
      for (let c = 0; c < 5; c++) {
        await humanScroll(notePage, rand(200, 400));
        await sleep(rand(200, 500));
      }

      // Click "show more" / expand if present
      for (const sel of ['[class*="toggle"]', '[class*="show-more"]', '[class*="load-more"]']) {
        const btn = await notePage.$(sel);
        if (btn) { try { await btn.click({ timeout: 500 }); await sleep(300); } catch {} }
      }

      // Extract content
      const data = await notePage.evaluate(() => {
        const pageTitle = document.title?.replace(/ - rednote$/, '').trim() || '';

        // Full body text
        const bodyEl = document.querySelector('#detail-desc span.note-text, .desc span.note-text');
        const body = bodyEl?.textContent?.trim() || '';

        // Author
        const author = document.querySelector('.author-wrapper .name, [class*="author"] .name')?.textContent?.trim() || '';

        // Meta data
        const likes = document.querySelector('meta[name="og:xhs:note_like"]')?.content || '';
        const collects = document.querySelector('meta[name="og:xhs:note_collect"]')?.content || '';
        const commentCount = document.querySelector('meta[name="og:xhs:note_comment"]')?.content || '';

        // Date - try multiple selectors
        const dateEl = document.querySelector('[class*="date"], [class*="bottom-container"] .date, .date');
        const date = dateEl?.textContent?.trim() || '';

        // All comments
        const commentEls = document.querySelectorAll('.parent-comment .right .content, .parent-comment .content .note-text');
        const comments = [...commentEls].map(c => c.textContent?.trim()).filter(t => t && t.length > 1);

        // Reply threads
        const replyEls = document.querySelectorAll('.reply-container .content .note-text, .reply-container .reply-item .content');
        const replies = [...replyEls].map(c => c.textContent?.trim()).filter(t => t && t.length > 1);

        // Tags
        const tags = [...document.querySelectorAll('#hash-tag a, [class*="tag"] a')].map(t => t.textContent?.trim()).filter(Boolean);

        return { pageTitle, body, author, likes, collects, date, commentCount, comments, replies, tags };
      });

      // ── Beach & species extraction ────────────────────
      const fullText = `${data.pageTitle} ${data.body} ${data.comments.join(' ')} ${data.replies.join(' ')} ${data.tags.join(' ')}`;

      // Beach patterns (English + Chinese)
      const beachPatterns = [
        [/vashon\s*(island)?/gi, 'Vashon Island'],
        [/瓦雄岛|瓦熊岛/g, 'Vashon Island'],
        [/purdy\s*(sand\s*spit|spit)?/gi, 'Purdy Sand Spit'],
        [/dash\s*point/gi, 'Dash Point'],
        [/dosewallips/gi, 'Dosewallips'],
        [/belfair/gi, 'Belfair State Park'],
        [/carr\s*inlet/gi, 'Carr Inlet'],
        [/green\s*point/gi, 'Green Point'],
        [/fox\s*island/gi, 'Fox Island'],
        [/penrose\s*point/gi, 'Penrose Point'],
        [/jarrell\s*cove/gi, 'Jarrell Cove'],
        [/joemma\s*beach/gi, 'Joemma Beach'],
        [/kopachuck/gi, 'Kopachuck'],
        [/sunrise\s*beach/gi, 'Sunrise Beach'],
        [/glacier\s*point/gi, 'Glacier Point'],
        [/quilcene/gi, 'Quilcene'],
        [/dabob\s*bay/gi, 'Dabob Bay'],
        [/hood\s*canal/gi, 'Hood Canal'],
        [/case\s*inlet/gi, 'Case Inlet'],
        [/oakland\s*bay/gi, 'Oakland Bay'],
        [/hammersley\s*inlet/gi, 'Hammersley Inlet'],
        [/totten\s*inlet/gi, 'Totten Inlet'],
        [/eld\s*inlet/gi, 'Eld Inlet'],
        [/budd\s*inlet/gi, 'Budd Inlet'],
        [/henderson\s*inlet/gi, 'Henderson Inlet'],
        [/nisqually\s*reach/gi, 'Nisqually Reach'],
        [/tolmie\s*state\s*park/gi, 'Tolmie State Park'],
        [/sequalitchew/gi, 'Sequalitchew'],
        [/birch\s*bay/gi, 'Birch Bay'],
        [/point\s*roberts/gi, 'Point Roberts'],
        [/long\s*beach/gi, 'Long Beach'],
        [/copalis\s*beach/gi, 'Copalis Beach'],
        [/mocrocks/gi, 'Mocrocks'],
        [/kalaloch/gi, 'Kalaloch'],
        [/ruby\s*beach/gi, 'Ruby Beach'],
        [/rialto\s*beach/gi, 'Rialto Beach'],
        [/indian\s*island/gi, 'Indian Island'],
        [/indianola/gi, 'Indianola'],
        [/shine\s*state\s*park/gi, 'Shine State Park'],
        [/wolfe\s*property/gi, 'Wolfe Property State Park'],
        [/saltwater\s*state\s*park/gi, 'Saltwater State Park'],
        [/richmond\s*beach/gi, 'Richmond Beach'],
        [/carkeek/gi, 'Carkeek Park'],
        [/golden\s*gardens/gi, 'Golden Gardens'],
        [/alki\s*beach/gi, 'Alki Beach'],
        [/des\s*moines\s*beach/gi, 'Des Moines Beach'],
        [/lowman\s*beach/gi, 'Lowman Beach'],
        [/howard\s*mill/gi, 'Howard Mill'],
        [/yellow\s*bank/gi, 'Yellow Bank'],
        [/dugualla\s*bay/gi, 'Dugualla Bay'],
        [/penn\s*cove/gi, 'Penn Cove'],
        [/coupeville/gi, 'Coupeville'],
        [/flagler\s*point/gi, 'Flagler Point'],
        [/point\s*defiance/gi, 'Point Defiance'],
        [/owen\s*beach/gi, 'Owen Beach'],
        [/titlow\s*beach/gi, 'Titlow Beach'],
        [/gorst\s*creek/gi, 'Gorst Creek'],
        [/tracyton\s*beach/gi, 'Tracyton Beach'],
        [/ennis\s*creek/gi, 'Ennis Creek'],
        [/sinclair\s*inlet/gi, 'Sinclair Inlet'],
        [/port\s*(gamble|ludlow|townsend|orchard)/gi, 'Port $1'],
        [/thorndyke\s*bay/gi, 'Thorndyke Bay'],
        [/foulweather\s*bluff/gi, 'Foulweather Bluff'],
        [/norwegian\s*point/gi, 'Norwegian Point'],
        [/lone\s*rock/gi, 'Lone Rock'],
        [/point\s*no\s*point/gi, 'Point No Point'],
        [/apple\s*tree\s*point/gi, 'Apple Tree Point'],
        [/kingston/gi, 'Kingston'],
        [/edmonds/gi, 'Edmonds'],
        [/mukilteo/gi, 'Mukilteo'],
      ];

      const speciesPatterns = [
        [/象拔蚌|geoduck/gi, 'Geoduck'],
        [/鸟贝|surf\s*clam/gi, 'Surf Clam'],
        [/马蚌|马棒|horse\s*clam/gi, 'Horse Clam'],
        [/蛤蜊|(?!razor)clam/gi, 'Clam'],
        [/生蚝|牡蛎|oyster/gi, 'Oyster'],
        [/螃蟹|crab/gi, 'Crab'],
        [/海胆|urchin/gi, 'Urchin'],
        [/razor\s*clam/gi, 'Razor Clam'],
        [/蛏子/gi, 'Razor Clam'],
      ];

      // Extract unique beaches
      const beaches = [];
      for (const [pat, name] of beachPatterns) {
        if (pat.test(fullText)) beaches.push(name);
      }
      data.beaches = [...new Set(beaches)];

      // Extract species
      const species = [];
      for (const [pat, name] of speciesPatterns) {
        if (pat.test(fullText)) species.push(name);
      }
      data.species = [...new Set(species)];

      // Determine geoduck relevance
      const hasGeoduck = data.species.some(s => s === 'Geoduck');
      const hasBeachInfo = data.beaches.length > 0 || /beach|point|spit|inlet|bay|park|island|岛|滩|岸/gi.test(fullText);
      data.hasGeoduck = hasGeoduck;
      data.hasBeachInfo = hasBeachInfo;

      // Track geoduck beaches
      if (hasGeoduck) {
        for (const beach of data.beaches) {
          if (!geoduckBeaches.has(beach)) geoduckBeaches.set(beach, []);
          geoduckBeaches.get(beach).push({
            title: data.pageTitle,
            author: data.author,
            date: data.date,
            body: data.body.slice(0, 200),
            url: link.href,
            comments: data.comments.slice(0, 3),
          });
        }
      }

      collected.push({ url: link.href, ...data });

      // Compact output
      const beachStr = data.beaches.length ? ` 🏖${data.beaches.join(',')}` : '';
      const speciesStr = data.species.length ? ` 🐚${data.species.join(',')}` : '';
      const geoduckStr = hasGeoduck ? ' ★GEODUCK' : '';
      const commentStr = data.comments.length ? ` 💬${data.comments.length}` : '';

      console.log(`[${i + 1}/${toVisit.length}] ${data.pageTitle?.slice(0, 50) || '(untitled)'} | ${data.author} | ${data.date} | ❤${data.likes}${beachStr}${speciesStr}${geoduckStr}${commentStr}`);

    } catch (err) {
      console.log(`[${i + 1}/${toVisit.length}] ERROR: ${err.message.slice(0, 60)}`);
    }

    await notePage.close();

    // Short pause between notes
    if (i < toVisit.length - 1) {
      await sleep(rand(2000, 5000));
    }
  }

  // ── Final Summary ─────────────────────────────────────
  console.log('\n\n══════════════════════════════════════════════════════');
  console.log(`  Scraped ${collected.length} notes\n`);

  // Beach × Species matrix
  const beachSpecies = new Map(); // beach -> Map(species -> count)
  for (const n of collected) {
    if (n.beaches.length === 0) continue;
    for (const beach of n.beaches) {
      if (!beachSpecies.has(beach)) beachSpecies.set(beach, new Map());
      for (const sp of n.species) {
        const spMap = beachSpecies.get(beach);
        spMap.set(sp, (spMap.get(sp) || 0) + 1);
      }
    }
  }

  console.log('🏖️ BEACH × SPECIES MATRIX (for map integration):');
  const sortedBeaches = [...beachSpecies.entries()].sort((a, b) => {
    const aTotal = [...a[1].values()].reduce((s, v) => s + v, 0);
    const bTotal = [...b[1].values()].reduce((s, v) => s + v, 0);
    return bTotal - aTotal;
  });
  for (const [beach, speciesMap] of sortedBeaches) {
    const speciesStr = [...speciesMap.entries()].sort((a, b) => b[1] - a[1]).map(([sp, c]) => `${sp}(${c})`).join(' ');
    console.log(`   ${beach}: ${speciesStr}`);
  }

  // Geoduck-specific beaches with details
  console.log('\n\n🦐 GEODUCK BEACHES (detailed):');
  if (geoduckBeaches.size === 0) {
    console.log('   (no explicit beach + geoduck matches found)');
  } else {
    for (const [beach, posts] of geoduckBeaches) {
      console.log(`\n   📍 ${beach} (${posts.length} posts)`);
      for (const p of posts.slice(0, 3)) {
        console.log(`      "${p.title?.slice(0, 50)}" by ${p.author} · ${p.date}`);
        if (p.comments.length) console.log(`      Comments: ${p.comments.join(' | ')}`);
      }
    }
  }

  // All species frequency
  const speciesFreq = new Map();
  for (const n of collected) {
    for (const sp of n.species) {
      speciesFreq.set(sp, (speciesFreq.get(sp) || 0) + 1);
    }
  }
  console.log('\n\n🐚 SPECIES FREQUENCY:');
  for (const [sp, count] of [...speciesFreq.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${sp}: ${count} posts`);
  }

  // Date distribution
  console.log('\n\n📅 POST DATE DISTRIBUTION:');
  const byMonth = new Map();
  for (const n of collected) {
    const d = n.date || 'unknown';
    const monthMatch = d.match(/(\d{1,2})\/(\d{4})/) || d.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})?/i);
    const key = monthMatch ? `${monthMatch[1]}/${monthMatch[2]}` : d;
    byMonth.set(key, (byMonth.get(key) || 0) + 1);
  }
  for (const [month, count] of byMonth) {
    console.log(`   ${month}: ${count} posts`);
  }

  // Posts with location info but unmatched beach names (any species)
  console.log('\n\n🔍 POSTS WITH UNMATCHED LOCATION HINTS:');
  for (const n of collected) {
    if (n.beaches.length === 0 && n.hasBeachInfo && n.species.length > 0) {
      const locComments = [...n.comments, ...n.replies].filter(c =>
        /beach|point|spit|inlet|bay|park|island|岛|滩|岸|位置|在哪|地址|near|Tacoma|Seattle|Olympia/gi.test(c)
      );
      if (locComments.length || /beach|point|spit|inlet|bay|park|island|岛|滩/gi.test(n.body)) {
        console.log(`\n   📌 ${n.pageTitle?.slice(0, 60)}`);
        console.log(`      ${n.author} · ${n.date} · ❤${n.likes} · 🐚${n.species.join(',')}`);
        if (n.body) console.log(`      "${n.body.slice(0, 150)}…"`);
        if (locComments.length) {
          console.log(`      Location hints:`);
          locComments.slice(0, 4).forEach(c => console.log(`        "${c}"`));
        }
      }
    }
  }

  writeFileSync('/tmp/xhs-results.json', JSON.stringify(collected, null, 2));
  console.log(`\nFull results saved to /tmp/xhs-results.json`);
  console.log('Chrome is still open — close when done.');
})();
