// Builds index.html (GitHub Pages) from artifact-page.html, the page the claude.ai dashboard runs.
// Adds a small stand-in for the dashboard runtime that loads data/*.csv, so both copies draw the same.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'artifact-page.html'), 'utf8')
  .replace('<meta name="dash-one-writer">', '')
  .replace(/<div class="asof">[^<]*<\/div>/, '<div class="asof" id="asof">Loading…</div>')
  // each page script gets its own scope, as in the dashboard runtime
  .replace(/<script>/g, '<script>{').replace(/<\/script>/g, '}</script>');

const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Northstar Apps Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400&display=swap">
<style>
:root {
  --color-bg: #f7f8fa; --color-panel: #ffffff; --color-fg: #1b1f27; --color-fg-muted: #5d6573; --color-border-line: #e2e5ea;
  --color-ok: #1f7a4d; --color-warn: #a05a00; --color-bad: #b42318;
  --c1: #2f6fdb; --c2: #d9822b; --c3: #7a5bd6;
  --cds-chart-grid: #eceef2; --cds-chart-axis: #c4c9d2; --cds-chart-reference: #8a93a3; --cds-text-secondary: #5d6573;
  --cds-surface-popover: #ffffff; --cds-border: #d5d9e0; --cds-shadow-popover: 0 4px 16px rgba(20, 30, 50, .12);
  --font-anthropic-sans: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-anthropic-serif: "Source Serif 4", Georgia, "Times New Roman", serif;
  --cds-font-size-caption: 12px; --cds-font-size-body: 14px; --cds-font-size-heading: 18px; --cds-font-size-title: 30px; --cds-font-weight-medium: 500;
  --cds-gap-xs: 4px; --cds-gap-sm: 8px; --cds-gap-md: 12px; --cds-gap-lg: 20px; --cds-gap-xl: 32px; --cds-pad-lg: 16px; --cds-radius: 10px;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #12151b; --color-panel: #1a1e26; --color-fg: #e8ebf0; --color-fg-muted: #9aa3b2; --color-border-line: #2b313c;
    --color-ok: #4cc38a; --color-warn: #e9a23b; --color-bad: #f2766b;
    --c1: #6a9cf0; --c2: #ec9d55; --c3: #a58bf0;
    --cds-chart-grid: #232833; --cds-chart-axis: #3a4150; --cds-chart-reference: #7d8696; --cds-text-secondary: #9aa3b2;
    --cds-surface-popover: #1f242d; --cds-border: #353c48; --cds-shadow-popover: 0 4px 16px rgba(0, 0, 0, .4);
    color-scheme: dark;
  }
}
body { margin: 0; background: var(--color-bg); color: var(--color-fg); font: 14px/1.4 var(--font-anthropic-sans); }
.wrap { max-width: 1180px; margin: 0 auto; padding-block: 28px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.nd a { color: inherit; }
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script>
// Stand-in for the claude.ai dashboard runtime: same dash.data / calc / draw calls, fed from CSV files.
(function () {
  const files = ['apps', 'android_daily', 'ratings', 'ios_daily', 'ads_daily', 'paid_ads', 'youtube', 'youtube_videos', 'youtube_year', 'youtube_monthly', 'youtube_top'];
  const src = {}, calcs = [], draws = [], hooks = [];
  const state = (id) => src[id] || { status: 'loading', data: [] };
  window.dash = {
    colors: ['var(--c1)', 'var(--c2)', 'var(--c3)'],
    data: (id) => state(id),
    calc: (id, o) => calcs.push({ id, ...o }),
    loader: () => {},
    onData: (fn) => hooks.push(fn),
    draw: (name, fn) => draws.push({ name, fn }),
    params: () => ({}), setParams: () => {}, resetParams: () => {}, setLink: () => {}, refresh: () => {},
  };
  const run = () => {
    hooks.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    for (const d of draws) document.querySelectorAll('[data-draw="' + d.name + '"]').forEach((el) => { try { d.fn(el); } catch (e) { console.error(d.name, e); } });
  };
  window.addEventListener('DOMContentLoaded', async () => {
    await Promise.all(files.map(async (id) => {
      try {
        const text = await fetch('data/' + id + '.csv', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); });
        const rows = d3.csvParse(text, (r) => { for (const k in r) if (r[k] === '') r[k] = null; return r; });
        src[id] = { status: 'ok', data: rows };
      } catch (e) { src[id] = { status: 'error', data: [], message: String(e) }; }
    }));
    for (const c of calcs) {
      try { src[c.id] = { status: 'ok', data: c.fn(...c.inputs.map((i) => state(i).data)) }; }
      catch (e) { src[c.id] = { status: 'error', data: null }; console.error(c.id, e); }
    }
    try {
      const m = await fetch('data/meta.json', { cache: 'no-cache' }).then((r) => r.json());
      document.getElementById('asof').textContent = 'Data collected ' + m.updated + ' from Play Console, App Store Connect, LevelPlay, Apple Ads and YouTube Studio. Refreshed every morning.';
    } catch (e) { document.getElementById('asof').textContent = ''; }
    run();
    let w = innerWidth;
    addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; run(); } });
  });
})();
</script>
</head>
<body>
<div class="wrap">
`;
const tail = `
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'index.html'), head + page + tail);
console.log('index.html written');
