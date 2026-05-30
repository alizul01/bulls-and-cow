const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'screenshot-home.png', fullPage: false });
  await page.goto('http://localhost:3001/vs-com', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'screenshot-vscom.png', fullPage: false });
  await browser.close();
  console.log('Screenshots saved.');
})();
