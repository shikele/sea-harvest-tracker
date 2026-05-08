import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  // Navigate to a known working note (with xsec_token)
  await page.goto('https://www.rednote.com/search_result/6856e4c40000000023004233?xsec_token=ABbG1gN1utdtkjSoFPQ83PU-xMM8-2InVkmZSjQNNBx5Q=&xsec_source=pc_search', {
    waitUntil: 'domcontentloaded', timeout: 15000
  });

  // Wait for content to render
  await new Promise(r => setTimeout(r, 4000));

  // Dismiss popups
  try { await page.keyboard.press('Escape'); } catch {}
  await new Promise(r => setTimeout(r, 500));

  const html = await page.content();
  writeFileSync('/tmp/xhs-note-debug.html', html);

  // Also extract key structural info
  const structure = await page.evaluate(() => {
    const getInfo = (el) => ({
      tag: el.tagName,
      classes: el.className?.toString()?.split(' ')?.filter(Boolean)?.slice(0, 10),
      text: el.textContent?.trim()?.slice(0, 150),
      id: el.id || undefined,
      dataAttrs: [...el.attributes].filter(a => a.name.startsWith('data-') || a.name.startsWith('class')).map(a => `${a.name}=${a.value?.slice(0, 50)}`).slice(0, 5),
      childCount: el.children.length
    });

    // Find all elements with text content > 20 chars
    const textElements = [...document.querySelectorAll('*')].filter(el => {
      const text = el.textContent?.trim();
      // Only leaf-ish elements or elements with direct text
      return text && text.length > 20 && text.length < 2000 &&
        (el.children.length === 0 || el.tagName === 'DIV' || el.tagName === 'SPAN' || el.tagName === 'P');
    }).map(getInfo);

    return { textElements, url: window.location.href };
  });

  console.log('URL:', structure.url);
  console.log('\nElements with text (>20 chars):');
  for (const el of structure.textElements) {
    // Skip nav/header/footer noise
    const text = el.text || '';
    if (/^(Explore|Notifications|Me|Search|Home|Create|Messages)$/i.test(text)) continue;
    if (text.length < 25) continue;
    console.log(`  <${el.tag}> .${el.classes?.join('.') || '(no class)'}: "${text.slice(0, 120)}"`);
  }

  console.log('\nFull HTML saved to /tmp/xhs-note-debug.html');
  await page.close();
})();
