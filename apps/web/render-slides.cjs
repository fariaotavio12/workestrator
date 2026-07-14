const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const workspace = process.argv[2];
const slidesDir = path.join(workspace, 'output', 'slides');
const imagesDir = path.join(workspace, 'output', 'images');

fs.mkdirSync(imagesDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1440 });

  const htmlFiles = fs.readdirSync(slidesDir)
    .filter(f => f.endsWith('.html'))
    .sort();

  for (const file of htmlFiles) {
    const name = path.basename(file, '.html');
    const filePath = path.resolve(path.join(slidesDir, file));
    const fileUrl = 'file:///' + filePath.split(path.sep).join('/');
    const outPath = path.join(imagesDir, name + '.jpg');

    await page.goto(fileUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: outPath, type: 'jpeg', quality: 95, fullPage: false });
    console.log('OK ' + name + '.jpg');
  }

  await browser.close();
  console.log('Done.');
})();
