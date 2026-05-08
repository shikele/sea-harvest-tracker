import { chromium } from 'playwright';
import { randomInt } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

// ── Config ──────────────────────────────────────────────
const MAX_NOTES = 100;
const CDP_PORT = 9222;
const PREV_FILE = './scripts/xhs-results.json';

// ── Helpers ─────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rand = (lo, hi) => randomInt(lo, hi);

async function humanScroll(page, totalPx) {
  let scrolled = 0;
  while (scrolled < totalPx) {
    const chunk = rand(40, 160);
    await page.mouse.wheel(rand(-3, 3), chunk);
    scrolled += chunk;
    await sleep(rand(40, 150));
  }
}

// ── Load previously collected URLs ──────────────────────
let prevData = [];
try {
  prevData = JSON.parse(readFileSync(PREV_FILE, 'utf8'));
} catch {}
const prevUrls = new Set(prevData.map(n => n.url));
console.log(`Previously collected: ${prevUrls.size} posts (will skip these)`);

// ── Main ────────────────────────────────────────────────
(async () => {
  console.log('Connecting to Chrome…');
  const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
  console.log('Connected!\n');

  const context = browser.contexts()[0];
  const pages = context.pages();
  let page = pages.find(p => p.url().includes('search_result') || p.url().includes('xiaohongshu') || p.url().includes('rednote'));
  if (!page) page = pages[0];

  console.log('Current page:', page.url());

  // If not on a search results page, navigate
  if (!page.url().includes('search_result')) {
    console.log('Please navigate to a search results page first. Current URL:', page.url());
    console.log('Waiting 10s for you to navigate…');
    await sleep(10000);
  }

  // Dismiss popups
  await page.keyboard.press('Escape');
  await sleep(500);

  // ── Phase 1: Scroll and collect links from current page ──
  console.log('\nScrolling to load more results…');
  let allNoteLinks = [];
  const seenHrefs = new Set();

  // Do multiple scroll passes to load up to 100+ results
  for (let pass = 0; pass < 50; pass++) {
    // Collect links from current view
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

    if (pass % 3 === 0) {
      console.log(`  Pass ${pass + 1}: ${links.length} found, ${newCount} new (total unique: ${allNoteLinks.length})`);
    }

    if (allNoteLinks.length >= MAX_NOTES + 10) break;

    // Slower human-like scroll to avoid detection
    await humanScroll(page, rand(200, 500));
    await sleep(rand(1500, 3500));

    // Occasional pause (like reading/thinking)
    if (pass % 5 === 3) {
      await sleep(rand(4000, 8000));
    }
  }

  // Filter out already-collected URLs
  const newLinks = allNoteLinks.filter(l => !prevUrls.has(l.href));
  console.log(`\nTotal unique links: ${allNoteLinks.length}`);
  console.log(`Already collected: ${allNoteLinks.length - newLinks.length}`);
  console.log(`New to scrape: ${newLinks.length}`);

  if (newLinks.length === 0) {
    console.log('\nNo new posts to scrape! All posts were already collected.');
    console.log('Chrome is still open — close when done.');
    return;
  }

  const toVisit = newLinks.slice(0, MAX_NOTES);
  console.log(`Visiting up to ${toVisit.length} new posts…\n`);

  // ── Phase 2: Visit notes ──────────────────────────────
  const collected = [];
  let geoduckBeaches = new Map();

  for (let i = 0; i < toVisit.length; i++) {
    const link = toVisit[i];
    const notePage = await context.newPage();

    try {
      // Navigate slowly
      await notePage.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(rand(3000, 6000));

      // Dismiss popups
      await notePage.keyboard.press('Escape');
      await sleep(rand(300, 600));

      // Quick check if content loaded
      const hasContent = await notePage.evaluate(() => !!document.querySelector('.note-content, .desc, .note-text'));
      if (!hasContent) {
        console.log(`[${i + 1}/${toVisit.length}] BLOCKED: ${link.title || '(untitled)'}`);
        await notePage.close();
        continue;
      }

      // Don't scroll the main post — jump straight to the comment section
      // and scroll only within the comment container to load all comments
      await notePage.evaluate(() => {
        const commentArea = document.querySelector(
          '.comments-el, [class*="comment-list"], .interaction-container, .second-block'
        );
        if (commentArea) {
          commentArea.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      });
      await sleep(rand(1000, 2000));

      // Scroll within the comment container to load ALL comments,
      // expanding every nested reply thread along the way
      const commentsLoaded = await notePage.evaluate(async () => {
        const selectors = [
          '.note-scroller',
          '.comments-el',
          '#noteContainer',
          '.note-detail-mask',
          '.detail-content',
          '[class*="comment-list"]',
          '[class*="commentContainer"]',
          '.interaction-container',
          '.second-block',
        ];

        let container = null;
        for (const sel of selectors) {
          container = document.querySelector(sel);
          if (container) break;
        }

        if (!container) {
          container = document.scrollingElement || document.documentElement;
        }

        let prevCount = 0;
        let stallCount = 0;

        for (let i = 0; i < 80; i++) {
          // Count all comment + reply elements
          const commentEls = container.querySelectorAll(
            '.parent-comment, [class*="comment-item"], .reply-container, .reply-item'
          );
          const currentCount = commentEls.length;

          if (currentCount === prevCount) {
            stallCount++;
          } else {
            stallCount = 0;
          }

          // Stop if no new comments for 5 consecutive scrolls
          if (stallCount >= 5 && i > 3) break;

          prevCount = currentCount;

          // Click ALL expand/reply buttons to reveal nested threads:
          // "展开" (expand), "查看更多回复" (view more replies), "X条回复" (X replies)
          const expandSelectors = [
            '[class*="toggle"]',
            '[class*="show-more"]',
            '[class*="load-more"]',
            '[class*="expand"]',
            '[class*="unfold"]',
            '[class*="reply-btn"]',
            '[class*="more-reply"]',
            '[class*="showReply"]',
            '[class*="fold"]',
            // Text-based: buttons/spans containing "展开", "回复", "条回复"
          ];
          for (const btnSel of expandSelectors) {
            const btns = container.querySelectorAll(btnSel);
            for (const btn of btns) {
              try {
                const text = btn.textContent?.trim() || '';
                // Only click if it looks like an expand/reply toggle
                if (/展开|回复|more|repl|load|show|expand|unfold|全部/i.test(text) || btnSel.includes('toggle') || btnSel.includes('fold')) {
                  btn.click();
                }
              } catch {}
            }
          }

          // Also find and click elements by text content (展开, X条回复)
          const allSpans = container.querySelectorAll('span, a, div');
          for (const el of allSpans) {
            const text = el.textContent?.trim() || '';
            if (/^展开$|^\d+\s*条回复$|^查看全部\d+条回复$|^更多回复$|^View more/i.test(text)) {
              try { el.click(); } catch {}
            }
          }

          // Scroll the container down slowly
          const scrollAmount = 200 + Math.floor(Math.random() * 200);
          container.scrollTop += scrollAmount;
          container.dispatchEvent(new WheelEvent('wheel', {
            bubbles: true,
            deltaY: scrollAmount,
          }));

          await new Promise(r => setTimeout(r, 500 + Math.random() * 800));
        }

        // Final pass: click any remaining expand buttons
        const finalSpans = container.querySelectorAll('span, a, div');
        for (const el of finalSpans) {
          const text = el.textContent?.trim() || '';
          if (/^展开$|^\d+\s*条回复$|^查看全部\d+条回复$|^更多回复$|^View more/i.test(text)) {
            try { el.click(); } catch {}
          }
        }
        await new Promise(r => setTimeout(r, 800));

        return container.querySelectorAll('.parent-comment, [class*="comment-item"], .reply-container, .reply-item').length;
      });

      // Final Playwright-level pass: click remaining expand buttons
      for (const sel of [
        '[class*="toggle"]', '[class*="show-more"]', '[class*="load-more"]',
        '[class*="expand"]', '[class*="unfold"]', '[class*="fold"]',
      ]) {
        const btns = await notePage.$$(sel);
        for (const btn of btns) {
          try {
            const text = await btn.textContent();
            if (/展开|回复|more|repl|load|show|expand|unfold/i.test(text)) {
              await btn.click({ timeout: 500 });
              await sleep(rand(300, 600));
            }
          } catch {}
        }
      }

      await sleep(rand(500, 1000));

      // Extract content
      const data = await notePage.evaluate(() => {
        const pageTitle = document.title?.replace(/ - rednote$/, '').replace(/ - 小红书$/, '').trim() || '';

        const bodyEl = document.querySelector('#detail-desc span.note-text, .desc span.note-text');
        const body = bodyEl?.textContent?.trim() || '';

        const author = document.querySelector('.author-wrapper .name, [class*="author"] .name')?.textContent?.trim() || '';

        const likes = document.querySelector('meta[name="og:xhs:note_like"]')?.content || '';
        const collects = document.querySelector('meta[name="og:xhs:note_collect"]')?.content || '';
        const commentCount = document.querySelector('meta[name="og:xhs:note_comment"]')?.content || '';

        const dateEl = document.querySelector('[class*="date"], [class*="bottom-container"] .date, .date');
        const date = dateEl?.textContent?.trim() || '';

        const commentEls = document.querySelectorAll('.parent-comment .right .content, .parent-comment .content .note-text');
        const comments = [...commentEls].map(c => c.textContent?.trim()).filter(t => t && t.length > 1);

        const replyEls = document.querySelectorAll('.reply-container .content .note-text, .reply-container .reply-item .content');
        const replies = [...replyEls].map(c => c.textContent?.trim()).filter(t => t && t.length > 1);

        const tags = [...document.querySelectorAll('#hash-tag a, [class*="tag"] a')].map(t => t.textContent?.trim()).filter(Boolean);

        return { pageTitle, body, author, likes, collects, date, commentCount, comments, replies, tags };
      });

      // ── Beach & species extraction ────────────────────
      const fullText = `${data.pageTitle} ${data.body} ${data.comments.join(' ')} ${data.replies.join(' ')} ${data.tags.join(' ')}`;

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
        [/fort\s*flagler/gi, 'Fort Flagler'],
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
        [/potlatch/gi, 'Potlatch State Park'],
        [/ala\s*spit/gi, 'Ala Spit'],
        [/frye\s*cove/gi, 'Frye Cove'],
        [/hope\s*island/gi, 'Hope Island'],
        [/samish\s*island/gi, 'Samish Island'],
        [/rat\s*island/gi, 'Rat Island'],
        [/lagoon\s*beach/gi, 'Lagoon Beach'],
        [/spencer\s*spit/gi, 'Spencer Spit'],
        [/odlin\s*park/gi, 'Odlin Park'],
        [/west\s*beach/gi, 'West Beach'],
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
        [/butter\s*clam|黄油贝/gi, 'Butter Clam'],
        [/manila\s*clam/gi, 'Manila Clam'],
        [/cockle/gi, 'Cockles'],
      ];

      const beaches = [];
      for (const [pat, name] of beachPatterns) {
        if (pat.test(fullText)) beaches.push(name);
      }
      data.beaches = [...new Set(beaches)];

      const species = [];
      for (const [pat, name] of speciesPatterns) {
        if (pat.test(fullText)) species.push(name);
      }
      data.species = [...new Set(species)];

      const hasGeoduck = data.species.some(s => s === 'Geoduck');
      const hasBeachInfo = data.beaches.length > 0 || /beach|point|spit|inlet|bay|park|island|岛|滩|岸/gi.test(fullText);
      data.hasGeoduck = hasGeoduck;
      data.hasBeachInfo = hasBeachInfo;

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

      const beachStr = data.beaches.length ? ` 🏖${data.beaches.join(',')}` : '';
      const speciesStr = data.species.length ? ` 🐚${data.species.join(',')}` : '';
      const geoduckStr = hasGeoduck ? ' ★GEODUCK' : '';
      const commentStr = data.comments.length ? ` 💬${data.comments.length}` : '';

      console.log(`[${i + 1}/${toVisit.length}] ${data.pageTitle?.slice(0, 50) || '(untitled)'} | ${data.author} | ${data.date} | ❤${data.likes}${beachStr}${speciesStr}${geoduckStr}${commentStr}`);

    } catch (err) {
      console.log(`[${i + 1}/${toVisit.length}] ERROR: ${err.message.slice(0, 80)}`);
    }

    await notePage.close();

    // Slower pauses between notes (5-12 seconds)
    if (i < toVisit.length - 1) {
      const pause = rand(5000, 12000);
      console.log(`  pausing ${(pause / 1000).toFixed(1)}s…`);
      await sleep(pause);
    }

    // Longer break every 8 posts (like a real person getting distracted)
    if ((i + 1) % 8 === 0 && i < toVisit.length - 1) {
      const longPause = rand(15000, 30000);
      console.log(`  ── break ${(longPause / 1000).toFixed(0)}s ──`);
      await sleep(longPause);
    }

    // Very long break every 25 posts (like stepping away)
    if ((i + 1) % 25 === 0 && i < toVisit.length - 1) {
      const bigPause = rand(45000, 90000);
      console.log(`  ── long break ${(bigPause / 1000).toFixed(0)}s (cooldown) ──`);
      await sleep(bigPause);
    }
  }

  // ── Phase 3: Summary ──────────────────────────────────
  console.log('\n\n══════════════════════════════════════════════════════');
  console.log(`  Scraped ${collected.length} NEW notes (total across both rounds: ${prevData.length + collected.length})\n`);

  // Merge with previous data
  const allData = [...prevData, ...collected];

  // Beach × Species matrix (all data)
  const beachSpecies = new Map();
  for (const n of allData) {
    if (n.beaches.length === 0) continue;
    for (const beach of n.beaches) {
      if (!beachSpecies.has(beach)) beachSpecies.set(beach, new Map());
      for (const sp of n.species) {
        const spMap = beachSpecies.get(beach);
        spMap.set(sp, (spMap.get(sp) || 0) + 1);
      }
    }
  }

  console.log('🏖️ BEACH × SPECIES MATRIX:');
  const sortedBeaches = [...beachSpecies.entries()].sort((a, b) => {
    const aTotal = [...a[1].values()].reduce((s, v) => s + v, 0);
    const bTotal = [...b[1].values()].reduce((s, v) => s + v, 0);
    return bTotal - aTotal;
  });
  for (const [beach, speciesMap] of sortedBeaches) {
    const speciesStr = [...speciesMap.entries()].sort((a, b) => b[1] - a[1]).map(([sp, c]) => `${sp}(${c})`).join(' ');
    console.log(`   ${beach}: ${speciesStr}`);
  }

  // Geoduck-specific beaches
  console.log('\n\n🦐 GEODUCK BEACHES (detailed):');
  if (geoduckBeaches.size === 0) {
    console.log('   (no new geoduck+beach matches in this round)');
  } else {
    for (const [beach, posts] of geoduckBeaches) {
      console.log(`\n   📍 ${beach} (${posts.length} posts)`);
      for (const p of posts.slice(0, 3)) {
        console.log(`      "${p.title?.slice(0, 50)}" by ${p.author} · ${p.date}`);
        if (p.comments.length) console.log(`      Comments: ${p.comments.join(' | ')}`);
      }
    }
  }

  // Species frequency (all data)
  const speciesFreq = new Map();
  for (const n of allData) {
    for (const sp of n.species) {
      speciesFreq.set(sp, (speciesFreq.get(sp) || 0) + 1);
    }
  }
  console.log('\n\n🐚 SPECIES FREQUENCY (all rounds):');
  for (const [sp, count] of [...speciesFreq.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${sp}: ${count} posts`);
  }

  // Posts with unmatched location hints
  console.log('\n\n🔍 NEW POSTS WITH UNMATCHED LOCATION HINTS:');
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

  // Save merged results
  const outFile = '/tmp/xhs-results.json';
  writeFileSync(outFile, JSON.stringify(allData, null, 2));
  // Also save to scripts dir
  writeFileSync('./scripts/xhs-results.json', JSON.stringify(allData, null, 2));
  console.log(`\nMerged results (${allData.length} total) saved to ${outFile} and ./scripts/xhs-results.json`);
  console.log('Chrome is still open — close when done.');
})();
