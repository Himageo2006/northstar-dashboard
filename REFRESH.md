# Northstar Apps Dashboard — daily refresh

Dashboard: https://claude.ai/artifact/GtFwrbQtJYDnQAcCyLD3r4 (claude.ai "Data" artifact type).
Its data are 6 attached CSV files, one per dataset document `datasets/<id>` in the artifact store.
Local copies of the current CSVs live in `data/` next to this file. The page (`index.html`) does NOT need to change on a refresh.

Rules: only READ from the consoles. Never change campaigns, apps, settings or anything else. Never click accept/consent/submit. If a site asks for sign-in, skip that source and report it.

## 1. Collect (window = rolling; "today" = run date, use UTC dates)

### Google Play — built-in browser (`mcp__Claude_Browser__*`, signed in as himageo2)
Open `https://play.google.com/console/u/0/developers/7605572335669653268/app-list`, wait ~10 s (it shows "جارٍ تحميل" while loading; UI is Arabic), get_page_text.
Each app card shows: عمليات اكتساب الأجهزة = device acquisitions (last 28 days) with % change, عدد الأجهزة النشطة شهريًا = monthly active devices with % change. "13.5 ألف" = 13,500. arrow_left_alt before a % = decrease (negative), arrow_right_alt = increase.
Apps: Mud Engineer Pro, Kingdom Rise, Captain Whiskers, Benny's Farm, MyMindCoach, Ostazzi.

### App Store — Claude in Chrome (`mcp__claude-in-chrome__*`)
Open any page on appstoreconnect.apple.com (e.g. /apps/6787178673/analytics), wait, then javascript_tool:
```js
const ids={"6787178673":"Benny's Farm","6793903295":"Kingdom Rise","6829241869":"Captain Whiskers","6819994685":"Mud Engineer Pro"};
const q=async(id,m,freq,s,e)=>{const r=await fetch('/analytics/api/v1/data/app/detail/measures',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-By':'dev.apple.com'},credentials:'include',body:JSON.stringify({adamId:[id],measures:[m],frequency:freq,startTime:s+'T00:00:00Z',endTime:e+'T00:00:00Z'})});const j=await r.json();return j.results?.[0]};
```
Daily, last 60 days ending yesterday: measures `units` (first-time downloads), `impressionsTotal`, `pageViewCount`, `proceeds`. Lifetime: frequency "month", start 2026-01-01, `units` total. Output is truncated around 1,500 chars, so keep results in `window.__x` and read them in slices.

### Ad revenue — LevelPlay, Claude in Chrome
Open `https://platform.ironsrc.com/partners/statistics/performance` (logged in as himageo2). Screenshots time out when Chrome is in background — use javascript_tool only.
Install a fetch hook that saves the authorization header of requests to `levelplay-stats.mediation.unity3d.com/graphql` into `window.__auth` (do NOT print the token), then make the page re-query (open "Metric: N selected", tick/untick a metric, click the visible "Apply"). Then:
```js
const Q=`query TableData($orderBy: OrderBy, $page: Int, $params: Dimensions!) { stats(params: $params, page: $page, orderBy: $orderBy) { count tableData { data { date breakValues { break value } metricSet { metric value } } } } }`;
// POST to https://levelplay-stats.mediation.unity3d.com/graphql with headers {content-type: application/json, authorization: window.__auth}
// body {operationName:'TableData', query:Q, variables:{params:{breakBy:['app'],dateInterval:'daily',isLevelPlay:true,requestedKpis:['revenue','activeUsers','impressions'],excludeFilters:[],startDate:<today-60>,endDate:<yesterday>},page:N,orderBy:{field:'date',direction:'ASC'}}}
// loop pages until rows >= count
```
App names come back like "Bennys Farm Village Life (Android)" / "Kingdom Rise Empire Builder (iOS)".

### Apple Ads — Claude in Chrome
`https://app-ads.apple.com/cm/app/25271490/report` (default range "Last 7 days"). Wait ~15 s, read body innerText after "Edit Columns". Per campaign the numbers are in order: Spend, Avg CPA, Avg CPT, Avg CPM, Impressions, Taps, Installs, TTR, CR, CR, Installs, CPA.

### YouTube — Claude in Chrome (Happy Kids TV channel UC3jMQFHmarlCW-hGsZSD06w)
- `https://studio.youtube.com/channel/UC3jMQFHmarlCW-hGsZSD06w` → "Current subscribers" and change in last 28 days.
- `.../analytics/tab-overview/period-default` → Views, Watch time (hours), usual range text.
- `.../analytics/tab-earn_revenue/period-default` → Estimated revenue (— means 0).
- `.../videos/upload` → rows `ytcp-video-row`: `#video-title`, `.tablecell-visibility`, `.tablecell-date`, `.tablecell-views`. Keep videos published in the last 14 days (plus scheduled ones), max 10.

## 2. Write the CSVs (same columns as today's files in data/ — read them first)
- apps.csv: app,store,status,installs_28d,installs_change_pct,monthly_active,monthly_active_change_pct,installs_lifetime,store_revenue_usd_28d (Play rows: installs/MAU from the app list; App Store rows: installs_28d = sum of last 28 days of units, installs_lifetime = 2026 total, store_revenue = sum of last 28 days proceeds). Status: Live / Closed test as shown in Play; App Store apps are Live.
- ios_daily.csv: date,app,downloads,impressions,page_views — one row per app per day, only apps/days with any non-zero value or after the app's first non-zero day.
- ads_daily.csv: date,app,platform,ad_revenue_usd,ad_users,ad_impressions — app "Benny's Farm"/"Kingdom Rise", platform Android/iOS, revenue rounded to 4 decimals.
- paid_ads.csv: campaign,app,network,period,spend_usd,impressions,taps,installs,cost_per_install_usd,daily_budget_usd (period like "Last 7 days to 12 Nov").
- youtube.csv: metric,value,window,note with metrics Subscribers, Subscriber change, Views, Watch time (hours), Estimated revenue (USD).
- youtube_videos.csv: title,published(YYYY-MM-DD),status(Public/Scheduled/…),views — shorten titles (drop emoji and "| Happy Kids TV").
Quote any field containing a comma. Write to data/ (overwrite).

If a source failed, keep its old CSV and do not touch that dataset.

## 3. Publish
For each changed CSV:
1. `Artifact` publish with `url` = dashboard, `asset: true`, `file_path` = the CSV → returns `/_blob/<id>`.
2. `ArtifactData get` `datasets/<id>` to read its current version and old url.
3. `ArtifactData update` with if_version: `{source: {url: <new blob url>}, updated: {at: <now ISO>, by: "Claude (daily refresh)"}, edit: {via: "claude", at: <now ISO>}}`.
4. Delete the OLD asset (`Artifact` action delete, url = dashboard, path = old 32-char id) only after the update succeeded.
Also update the asof line? No — the page text says "Snapshot collected 11 Nov"; replace that date: `ArtifactData update` files/index.html `edit` first, then `str_replace` field `text` old "Snapshot collected <old date>" → new date (read the doc first to find the current date and version).
Dataset ids: apps, ios_daily, ads_daily, paid_ads, youtube, youtube_videos.

## 4. Save to GitHub
In `D:\Claude ai\northstar-dashboard` (private repo github.com/Himageo2006/northstar-dashboard, branch main): `git add data && git commit -m "Daily data refresh <YYYY-MM-DD>"` then `git push`. Skip if nothing changed. Push only this repo.

## 5. Check
Read `data/users/me/check` of the dashboard; if "failed", report what it says. Close Chrome tabs you opened.
Report in 3–5 lines: which sources refreshed, any that failed, and the headline numbers (28-day installs, ad revenue, Apple Ads 7-day spend/installs, YouTube subscribers).
