const { test, expect } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');

// Keep CI deterministic and avoid recording test visits in analytics.
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    return route.fulfill({ status: 200, body: '' });
  });
});

for (const path of ['/', '/cv.html']) {
  for (const width of [320, 390, 480, 768, 769, 800, 900, 939, 940, 941, 1024, 1280]) {
    test(`${path} fits at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        brokenImages: [...document.images].filter(image => !image.naturalWidth).length,
        offscreenLinks: [...document.querySelectorAll('a')].filter(link => {
          const box = link.getBoundingClientRect();
          return box.left < 0 || box.right > innerWidth;
        }).map(link => link.textContent.trim()),
      }));
      expect(layout).toEqual({ overflow: false, brokenImages: 0, offscreenLinks: [] });
      await expect(page.locator('h1')).toBeVisible();
    });
  }

  test(`${path} passes accessibility checks and resolves local resources`, async ({ page, request }) => {
    await page.goto(path);
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => (await axe.run()).violations);
    expect(violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) }))).toEqual([]);
    const urls = await page.locator('[href], [src]').evaluateAll(elements =>
      [...new Set(elements.map(e => e.href || e.src).filter(url => url && new URL(url).origin === location.origin))]);
    for (const url of urls) expect((await request.get(url)).status(), url).toBe(200);
  });

  test(`${path} is readable without JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
        ? route.continue() : route.fulfill({ status: 200, body: '' }));
      await page.goto(`${baseURL}${path}`);
      await expect(page.locator('h1')).toHaveText('Emir Belkahia');
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.locator('a').count()).toBeGreaterThan(0);
      if (path === '/') await expect(page.locator('.container')).toHaveCSS('opacity', '1');
    } finally { await context.close(); }
  });
}

test('structured identity agrees with the pages and discovery files are valid', async ({ page, request }) => {
  const people = [];
  for (const path of ['/', '/cv.html']) {
    await page.goto(path);
    const graph = await page.locator('script[type="application/ld+json"]').evaluate(e => JSON.parse(e.textContent)['@graph']);
    const person = graph.find(node => node['@type'] === 'Person');
    expect(graph.find(node => node['@type'] === 'ProfilePage').mainEntity['@id']).toBe(person['@id']);
    await expect(page.locator('h1')).toHaveText(person.name);
    await expect(page.locator(path === '/' ? '.subtitle' : '.main-header .job-title')).toContainText(person.jobTitle);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://emirbelkahia.com${path}`);
    people.push(person);
  }
  for (const key of Object.keys(people[0]).filter(key => key !== 'worksFor')) expect(people[1][key], key).toEqual(people[0][key]);
  expect(people[1].worksFor[0]).toEqual(people[0].worksFor[0]);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const urls = await page.evaluate(xml => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid sitemap XML');
    return [...doc.querySelectorAll('loc')].map(e => e.textContent);
  }, sitemap);
  expect(urls).toEqual(['https://emirbelkahia.com/', 'https://emirbelkahia.com/cv.html']);
  for (const url of urls) expect((await request.get(new URL(url).pathname)).status()).toBe(200);
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots.match(/^User-agent:/gm)).toHaveLength(1);
  expect(robots).toContain('Disallow: /cv.pdf');
  expect(robots).toContain('Sitemap: https://emirbelkahia.com/sitemap.xml');
  const manifest = await (await request.get('/favicon/manifest.json')).json();
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
});

test('the committed PDF contains the current ATS content', async ({ page }) => {
  await page.goto('/cv-ats.html');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const paragraphs = await page.locator('h1, h2, .title, .summary, li, .job-title, .job-date, .project-title, .project-desc, .education-title, .education-year, .skills-grid span').allTextContents();
  // Poppler can remove a hyphen when a word wraps across lines.
  const normalize = value => value.normalize('NFKC').replace(/[\s\u00ad-]+/g, '').toLowerCase();
  const pdf = normalize(execFileSync('pdftotext', ['cv.pdf', '-'], { encoding: 'utf8' }));
  for (const text of paragraphs) {
    // Avoid logging the PDF's contact details when a content assertion fails.
    expect(pdf.includes(normalize(text)), `PDF missing ATS content: ${normalize(text)}`).toBe(true);
  }
  const source = readFileSync('cv-ats.html', 'utf8');
  const sentinel = '<em>Email &amp; phone available on PDF version.</em> |\n        <a href="https://www.linkedin.com/in/emirbelkahia" target="_blank">linkedin.com/in/emirbelkahia</a>';
  expect(source.split(sentinel)).toHaveLength(2);
});

for (const asset of ['terminal.css', 'terminal.js']) {
  test(`terminal retries after ${asset} fails`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    expect(await page.locator('[src="assets/terminal.js"], [href="assets/terminal.css"]').count()).toBe(0);
    await page.route(`**/assets/${asset}`, route => route.abort());
    await page.keyboard.type('terminal');
    await expect(page.locator('[href="assets/terminal.css"]')).toHaveCount(0);
    await expect(page.locator('#terminal-overlay')).toHaveCount(0);
    await page.unroute(`**/assets/${asset}`);
    await page.keyboard.type('terminal');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCSS('position', 'fixed');
    expect(errors).toEqual([]);
  });
}

test('terminal handles unknown commands, keyboard closure and rapid reopening', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('.links a').first().focus();
  await page.keyboard.type('terminal');
  const input = page.getByRole('textbox', { name: 'Terminal command' });
  await expect(input).toBeFocused();
  for (const command of ['__proto__', 'constructor', 'toString', 'unknown']) {
    await input.fill(command);
    await input.press('Enter');
    await expect(page.locator('#term-output')).toContainText('command not found');
  }
  await input.fill('help');
  await input.press('Enter');
  await expect(page.locator('#term-output')).toContainText('Available commands:');
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  expect(await page.evaluate(async () => (await axe.run(document.querySelector('dialog'))).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.failureSummary) })))).toEqual([]);
  await input.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Close terminal' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.links a').first()).toBeFocused();
  await page.keyboard.type('terminal');
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await page.keyboard.type('terminal');
  await page.waitForTimeout(350); // Cross the previous close timer's deadline.
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#terminal-overlay')).toHaveCount(1);
  expect(errors).toEqual([]);
});
