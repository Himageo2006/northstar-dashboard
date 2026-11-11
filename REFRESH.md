# Northstar Apps Dashboard — daily refresh

Dashboard: https://claude.ai/artifact/GtFwrbQtJYDnQAcCyLD3r4 (claude.ai "Data" artifact type).
Its data are 11 attached CSV files, one per dataset document `datasets/<id>` in the artifact store.
Local copies of the current CSVs live in `data/` next to this file. The claude.ai page (`artifact-page.html`, stored in the artifact as files/index.html) and the public GitHub Pages page (`index.html`, built by `node tools/build-pages.js` from artifact-page.html) do NOT need to change on a refresh.

Rules: only READ from the consoles. Never change campaigns, apps, settings or anything else. Never click accept/consent/submit. If a site asks for sign-in, skip that source and report it.

## 1. Collect (window = rolling; "today" = run date, use UTC dates)

### Google Play — built-in browser (`mcp__Claude_Browser__*`, signed in as himageo2)
Open `https://play.google.com/console/u/0/developers/7605572335669653268/app-list`, wait ~10 s (it shows "جارٍ تحميل" while loading; UI is Arabic), get_page_text.
Each app card shows: عمليات اكتساب الأجهزة = device acquisitions (last 28 days) with % change, عدد الأجهزة النشطة شهريًا = monthly active devices with % change. "13.5 ألف" = 13,500. arrow_left_alt before a % = decrease (negative), arrow_right_alt = increase.
Apps: Mud Engineer Pro, Kingdom Rise, Captain Whiskers, Benny's Farm, MyMindCoach, Ostazzi.

**Daily Android installs:** open `https://play.google.com/console/u/0/developers/7605572335669653268/app/4972053565840119838/statistics`, wait ~12 s, then javascript_tool (the auth headers ride in the query string of the page's own `statspage:startupData` request; never print them):
```js
const su=performance.getEntriesByType('resource').map(e=>e.name).find(n=>n.includes('statspage:startupData'));
const q=su.slice(su.indexOf('?'));
const ts=(app,from,to)=>new Promise(res=>{const r=new XMLHttpRequest();r.open('POST','https://playconsolestatsfrontend-pa.clients6.google.com/v1/developers/7605572335669653268/apps/'+app+'/statspage/time_series'+q);r.withCredentials=true;r.onload=()=>res(r.responseText);r.send(JSON.stringify({"1":{"1":{"1":"7605572335669653268"},"2":{"1":app}},"2":{"1":from,"2":to},"4":[{"1":{"1":4,"2":1,"3":1,"4":1},"2":2}],"5":1,"7":{"1":[{"1":1}]}}))});
// from/to = {"1":YYYY,"2":M,"3":D}; answer JSON: ['1'][0]['4']['1'] = points, each {'2':{'2':"<count>"}, '4':{date}} (no '2' = 0)
```
Play app ids: Benny's Farm 4972053565840119838, Kingdom Rise 4975955969244754659, MyMindCoach 4973872268469513434, Ostazzi 4974692441579335100, Captain Whiskers 4973379803554666074, Mud Engineer Pro 4973249566921524184. Pull the last 60 days (today-60 .. today-1; Play's last 2 days are usually missing).

### Ratings — Bash, public pages, no sign-in
- Play: `curl -s -A "Mozilla/5.0" "https://play.google.com/store/apps/details?id=<package>&hl=en&gl=us" | grep -oE 'Rated [0-9.]+ stars out of five stars'` and the download badge (`[0-9.,]+[KM]?\+` before "Downloads"). Packages: com.blossom.merge, com.kingdomrise.game, com.mymindcoach.app, com.ostazai.app (Captain Whiskers and Mud Engineer Pro are in closed test, no public page).
- App Store: `curl -s "https://itunes.apple.com/lookup?id=<id>"` → averageUserRating, userRatingCount.

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
- 12 months by month: open `.../analytics/tab-overview/period-year/explore?entity_type=CHANNEL&entity_id=UC3jMQFHmarlCW-hGsZSD06w&time_period=year&explore_type=TABLE_AND_CHART&metric=EXTERNAL_VIEWS&granularity=MONTH&t_metrics=EXTERNAL_VIEWS&t_metrics=EXTERNAL_WATCH_TIME&t_metrics=AVERAGE_WATCH_TIME&t_metrics=TOTAL_ESTIMATED_EARNINGS&dimension=MONTH&o_column=MONTH&o_direction=ANALYTICS_ORDER_DIRECTION_DESC`, wait ~10 s, read `document.body.innerText` with javascript_tool (get_page_text shows only the header). The table gives a Total row (views, watch hours to one decimal, average view duration, revenue) and one row per month: views | % | watch hours | % | avg duration | revenue | %. "—" = 0.
- 12-month change and top videos: `.../analytics/tab-overview/period-year` page text → Watch time "…% less/more than previous 365 days", Subscribers "+80.2K" with the same kind of %, and the Top content list (title + views).
- `.../videos/upload` → rows `ytcp-video-row`: `#video-title`, `.tablecell-visibility`, `.tablecell-date`, `.tablecell-views`. Keep videos published in the last 14 days (plus scheduled ones), max 10.

## 2. Write the CSVs (same columns as today's files in data/ — read them first)
- apps.csv: app,store,status,installs_28d,installs_change_pct,monthly_active,monthly_active_change_pct,installs_lifetime,store_revenue_usd_28d (Play rows: installs/MAU from the app list; App Store rows: installs_28d = sum of last 28 days of units, installs_lifetime = 2026 total, store_revenue = sum of last 28 days proceeds). Status: Live / Closed test as shown in Play; App Store apps are Live.
- android_daily.csv: date,app,installs — one row per app per day for all 6 Play apps (0 where Play gives no value).
- ratings.csv: app,store,rating,ratings_count,public_downloads — Play rows for the 4 public Play apps, App Store rows for all 4 iOS apps (empty rating when there are none).
- ios_daily.csv: date,app,downloads,impressions,page_views — one row per app per day, only apps/days with any non-zero value or after the app's first non-zero day.
- ads_daily.csv: date,app,platform,ad_revenue_usd,ad_users,ad_impressions — app "Benny's Farm"/"Kingdom Rise", platform Android/iOS, revenue rounded to 4 decimals.
- paid_ads.csv: campaign,app,network,period,spend_usd,impressions,taps,installs,cost_per_install_usd,daily_budget_usd (period like "Last 7 days to 12 Nov").
- youtube.csv: metric,value,window,note with metrics Subscribers, Subscriber change, Views, Watch time (hours), Estimated revenue (USD). The Views note must read "Typical range <low>-<high>" (digits only, e.g. "Typical range 3600-85300") — the dashboard's alerts read it.
- youtube_year.csv: metric,value,change_pct,note with metrics Views, Watch time (hours) (exact Total from advanced mode), Subscribers gained (e.g. 80200 for "+80.2K"), Estimated revenue (USD), Average view duration (sec). change_pct is negative for "less than previous 365 days"; leave empty if Studio shows none.
- youtube_monthly.csv: month(YYYY-MM),views,watch_hours,avg_view_duration_sec,revenue_usd,note — oldest month first; note "from <D Mon>" on the first (partial) month and "to <D Mon>" on the current (ongoing) month, empty otherwise.
- youtube_top.csv: rank,title,views — the 10 top content rows for 365 days, titles shortened like youtube_videos.
- youtube_videos.csv: title,published(YYYY-MM-DD),status(Public/Scheduled/…),views — shorten titles (drop emoji and "| Happy Kids TV").
Quote any field containing a comma. Write to data/ (overwrite). Also write data/meta.json as {"updated": "<D Mon YYYY>"} (e.g. "12 Nov 2026") — the public page shows it.

If a source failed, keep its old CSV and do not touch that dataset.

## 3. Publish
For each changed CSV:
1. `Artifact` publish with `url` = dashboard, `asset: true`, `file_path` = the CSV → returns `/_blob/<id>`.
2. `ArtifactData get` `datasets/<id>` to read its current version and old url.
3. `ArtifactData update` with if_version: `{source: {url: <new blob url>}, updated: {at: <now ISO>, by: "Claude (daily refresh)"}, edit: {via: "claude", at: <now ISO>}}`.
4. Delete the OLD asset (`Artifact` action delete, url = dashboard, path = old 32-char id) only after the update succeeded.
Also update the asof line? No — the page text says "Snapshot collected 11 Nov"; replace that date: `ArtifactData update` files/index.html `edit` first, then `str_replace` field `text` old "Snapshot collected <old date>" → new date (read the doc first to find the current date and version).
Dataset ids: apps, android_daily, ratings, ios_daily, ads_daily, paid_ads, youtube, youtube_videos, youtube_year, youtube_monthly, youtube_top.

## 4. Save to GitHub
In `D:\Claude ai\northstar-dashboard` (repo github.com/Himageo2006/northstar-dashboard, branch main): `git add data && git commit -m "Daily data refresh <YYYY-MM-DD>"` then `git push`. Skip if nothing changed. Push only this repo. The repo is PUBLIC and serves the dashboard at https://himageo2006.github.io/northstar-dashboard/ — never commit tokens, keys or anything besides the data files.

## 5. Check
Read `data/users/me/check` of the dashboard; if "failed", report what it says. Close Chrome tabs you opened.
Report in 3–5 lines: which sources refreshed, any that failed, and the headline numbers (28-day installs, ad revenue, Apple Ads 7-day spend/installs, YouTube subscribers).
