import { chromium } from 'playwright';
import { randomInt } from 'crypto';
import { execSync } from 'child_process';

// ── Config ──────────────────────────────────────────────
const SEARCH_KEYWORD = '西雅图拔蚌';
const MAX_NOTES = 5;
const SCROLL_PASSES = 3;
const CDP_PORT = 9222;

// ── Helpers ─────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const humanDelay = (lo = 800, hi = 2500) => sleep(randomInt(lo, hi));
const humanType = async (page, text) => {
  for (const ch of text) {
    await page.keyboard.type(ch, { delay: randomInt(30, 120) });
  }
};

// ── Main ────────────────────────────────────────────────
(async () => {
  // Copy Chrome profile to temp dir (Chrome refuses remote debugging on default profile)
  const TMP_PROFILE = '/tmp/xhs-chrome-profile';
  console.log('Copying Chrome profile to temp directory for remote debugging…');
  execSync(`rm -rf "${TMP_PROFILE}"`);
  execSync(`mkdir -p "${TMP_PROFILE}"`);
  // Copy just the Default profile folder (cookies, local storage, etc.)
  const chromeDefault = '/Users/keleshi/Library/Application Support/Google/Chrome/Default';
  execSync(`cp -r "${chromeDefault}" "${TMP_PROFILE}/Default" 2>/dev/null || true`);
  // Copy key config files
  for (const f of ['Local State', 'First Run', 'preferences', 'Secure Preferences']) {
    execSync(`cp "/Users/keleshi/Library/Application Support/Google/Chrome/${f}" "${TMP_PROFILE}/" 2>/dev/null || true`);
  }

  // Quit existing Chrome
  console.log('Quitting existing Chrome…');
  try { execSync('osascript -e "tell application \\"Google Chrome\\" to quit"', { stdio: 'inherit' }); } catch {}
  await sleep(2000);

  console.log('Launching Chrome with remote debugging (port 9222)…');
  console.log('Using your real Chrome profile — you should already be logged into Xiaohongshu.\n');

  execSync(
    `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --user-data-dir="${TMP_PROFILE}" --remote-debugging-port=${CDP_PORT} https://www.xiaohongshu.com &`,
    { stdio: 'inherit', shell: '/bin/bash', detached: true }
  );

  // Wait for Chrome to start and CDP to be available
  console.log('Waiting for Chrome to start…');
  await sleep(6000);

  // Connect to the running Chrome via CDP
  let browser;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
      break;
    } catch {
      console.log(`  Retrying CDP connection (${attempt + 1}/10)…`);
      await sleep(2000);
    }
  }

  if (!browser) {
    console.error('Could not connect to Chrome. Make sure Chrome is running with --remote-debugging-port=9222');
    process.exit(1);
  }

  console.log('Connected to Chrome!\n');

  // Use the first (already open) context
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  const page = pages.find(p => p.url().includes('xiaohongshu')) || pages[0];

  if (!page.url().includes('xiaohongshu')) {
    console.log('Navigating to xiaohongshu.com…');
    await page.goto('https://www.xiaohongshu.com', { waitUntil: 'domcontentloaded' });
  }

  await humanDelay(2000, 4000);

  // 0. Dismiss any popup/modal overlays (login prompt, cookie consent, etc.)
  const dismissSelectors = [
    'i.reds-mask[aria-label="弹窗遮罩"]',          // popup mask overlay
    'div[class*="close"] svg',                       // close buttons
    'button[class*="close"]',
    'div[class*="modal"] button[class*="close"]',
    'svg[class*="close"]',
    '.login-container .close-circle',                // login dialog close
  ];
  for (const sel of dismissSelectors) {
    const el = await page.$(sel);
    if (el) {
      console.log(`Dismissing overlay: ${sel}`);
      try { await el.click({ timeout: 2000 }); } catch {}
      await humanDelay(500, 1000);
    }
  }
  // Also try pressing Escape to dismiss modals
  await page.keyboard.press('Escape');
  await humanDelay(500, 1000);

  // 1. Search — use direct URL navigation to avoid overlay issues
  console.log(`Searching for "${SEARCH_KEYWORD}"…`);
  const encoded = encodeURIComponent(SEARCH_KEYWORD);
  await page.goto(`https://www.xiaohongshu.com/search_result?keyword=${encoded}&source=web_explore_feed`, {
    waitUntil: 'domcontentloaded',
  });

  await humanDelay(3000, 5000);

  // 2. Scroll like a human
  console.log('Scrolling through search results…');
  for (let i = 0; i < SCROLL_PASSES; i++) {
    const scrollPx = randomInt(400, 800);
    await page.mouse.wheel(0, scrollPx);
    console.log(`  Scroll pass ${i + 1}/${SCROLL_PASSES} (+${scrollPx}px)`);
    await humanDelay(1500, 3000);
  }

  // 3. Collect note links
  const noteSelectors = [
    'section.note-item a',
    'div.note-item a[href*="/explore/"]',
    'a.cover[href*="/explore/"]',
    'div[class*="note"] a[href*="/explore/"]',
    'a[href*="/search_result/"]',
    'div.feeds-container a[href*="/explore/"]',
  ];

  let noteLinks = [];
  for (const sel of noteSelectors) {
    noteLinks = await page.$$eval(sel, els =>
      els.map(a => ({
        href: a.href,
        title: a.getAttribute('title') || a.textContent?.trim()?.slice(0, 80) || '',
      })).filter(n => n.href)
    );
    if (noteLinks.length) {
      console.log(`Found ${noteLinks.length} notes via selector "${sel}"`);
      break;
    }
  }

  if (!noteLinks.length) {
    console.log('No note links found with known selectors. Dumping page snippet for debugging…');
    const html = await page.content();
    // Save full HTML to file for inspection
    const { writeFileSync } = await import('fs');
    writeFileSync('/tmp/xhs-debug.html', html);
    console.log('Full page HTML saved to /tmp/xhs-debug.html');
    console.log('First 2000 chars:\n');
    console.log(html.slice(0, 2000));
    console.log('\n---\nYou may need to log in first. Chrome is still open — go check it.');
    console.log('Press Ctrl+C when done.');
    await sleep(600000);
    return;
  }

  // 4. Visit notes one by one
  const toVisit = noteLinks.slice(0, MAX_NOTES);
  const collected = [];

  for (let i = 0; i < toVisit.length; i++) {
    const link = toVisit[i];
    console.log(`\n── Note ${i + 1}/${toVisit.length}: ${link.title || link.href} ──`);

    const notePage = await context.newPage();
    try {
      await notePage.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await humanDelay(2000, 4000);

      // Scroll the note like a reader
      for (let s = 0; s < randomInt(2, 4); s++) {
        await notePage.mouse.wheel(0, randomInt(200, 500));
        await humanDelay(1000, 2500);
      }

      // Extract content
      const data = await notePage.evaluate(() => {
        const title = document.querySelector('#detail-title, div.title, h1, [class*="title"]')?.textContent?.trim() || '';
        const author = document.querySelector('[class*="author"] [class*="name"], [class*="user-name"], div.username')?.textContent?.trim() || '';
        const body = document.querySelector('#detail-desc, div.desc, div[class*="desc"], div[class*="content"], div[class*="note-text"]')?.textContent?.trim() || '';
        const likes = document.querySelector('[class*="like-count"], [class*="count"], span[class*="like"]')?.textContent?.trim() || '';
        const date = document.querySelector('[class*="date"], [class*="time"], span.date')?.textContent?.trim() || '';
        const images = [...document.querySelectorAll('img[class*="slide"], img[src*="sns-webpic"], div[class*="swiper"] img')].map(img => img.src).filter(Boolean);
        const comments = [...document.querySelectorAll('div[class*="comment"] span, div[class*="comment-item"]')].slice(0, 5).map(c => c.textContent?.trim()).filter(Boolean);
        return { title, author, body, likes, date, images: images.length, comments };
      });

      collected.push({ url: link.href, ...data });

      console.log(`  Title:   ${data.title || '(none)'}`);
      console.log(`  Author:  ${data.author || '(unknown)'}`);
      console.log(`  Date:    ${data.date || '(unknown)'}`);
      console.log(`  Likes:   ${data.likes || '(unknown)'}`);
      console.log(`  Body:    ${data.body?.slice(0, 300) || '(empty)'}${data.body?.length > 300 ? '…' : ''}`);
      if (data.images) console.log(`  Images:  ${data.images}`);
      if (data.comments.length) console.log(`  Comments: ${data.comments.join(' | ')}`);

    } catch (err) {
      console.log(`  Error loading note: ${err.message}`);
    }

    await notePage.close();

    if (i < toVisit.length - 1) {
      const pause = randomInt(3000, 6000);
      console.log(`  Pausing ${(pause / 1000).toFixed(1)}s before next note…`);
      await sleep(pause);
    }
  }

  // 5. Summary
  console.log('\n═══════════════════════════════════════');
  console.log(`Checked ${collected.length} notes about "${SEARCH_KEYWORD}"`);
  for (const n of collected) {
    console.log(`\n📌 ${n.title || '(untitled)'}`);
    console.log(`   ${n.url}`);
    console.log(`   ${n.body?.slice(0, 200) || '(no content)'}…`);
  }

  console.log('\nDone! Chrome is still open — close it manually or press Ctrl+C.');
  await sleep(600000);
})();
