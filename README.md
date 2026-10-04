# Feed Monitor

A Chrome extension that watches for mentions of whatever you care about — a brand, a client, your own name — across **Google News, YouTube, Reddit, and podcast feeds**. It polls every five minutes in the background and collects what it finds into a dashboard.

**It needs no API key.** The whole thing runs on public RSS. Paid news APIs are supported as optional fallbacks, but the extension works fully without them.

---

## The interesting part: parsing XML without a DOM

Manifest V3 moved extension background scripts to **service workers**, and service workers have no DOM. No `document`, no `DOMParser`. Which is a problem when your entire job is reading RSS and Atom feeds, because the normal way to parse XML in a browser is:

```js
new DOMParser().parseFromString(xmlText, 'text/xml')  // ReferenceError in a service worker
```

There's no polyfill worth shipping for this, and pulling in a full XML library to read a handful of tags is a lot of bundle for very little. So `parseRSSXML` ([`background.js:943`](background.js)) parses the feeds directly:

```js
// Extract items using regex (since DOMParser isn't available in service workers)
const itemRegex  = /<item[^>]*>([\s\S]*?)<\/item>/gi;   // RSS 2.0
const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi; // Atom

let matches = [...xmlText.matchAll(itemRegex), ...xmlText.matchAll(entryRegex)];
```

Handling both `<item>` and `<entry>` in one pass matters, because the sources disagree: Google News and most podcast feeds are RSS 2.0, while YouTube channel feeds are Atom. Running both patterns and concatenating means one code path covers every source.

Around that core there's the unglamorous work that makes feed parsing actually hold up: unescaping nested CDATA and HTML entities (`cleanXMLContent`), pulling a readable publisher name out of Google News' redirect URLs (`extractSourceFromLink`), and stripping markup out of descriptions (`cleanDescription`).

**Yes, regex-parsing XML is normally the wrong answer.** It's the right answer here precisely because the environment removed the alternative, and because the input is a narrow, well-formed subset — a handful of known tags from a handful of known feed providers — rather than arbitrary XML.

## How it works

```
chrome.alarms (every 5 min)
          │
          ▼
   checkForMentions
          │
          ├─► generateRSSUrls ──► Google News RSS · YouTube · Reddit · Podcast feeds
          │                              │
          │                              ▼
          │                      fetchAndParseRSS ──► parseRSSXML (regex, no DOM)
          │
          ├─► searchGNews ········ optional, skipped without a key
          └─► searchGoogleCustom · optional, skipped without a key
                          │
                          ▼
              chrome.storage.local ──► dashboard.html
                          │
                          ▼
                 cleanupOldMentions
```

Notes on behaviour:

- **Polls every 5 minutes**, capped at 20 results per feed, over a rolling 14-day window. Google News returns articles older than the requested range even when you ask for one day, so the window is deliberately wider than the query.
- **Optional APIs degrade silently.** `searchGNews` checks for a configured key and returns early if there isn't one ([`background.js:490`](background.js)) — no errors, no broken UI, the RSS path just carries on.
- **Old mentions are pruned** by `cleanupOldMentions` so `chrome.storage.local` doesn't grow without bound.

## Install

```bash
git clone https://github.com/priyajnvian/feed-monitor.git
```

- Open `chrome://extensions/`
- Turn on **Developer mode**
- **Load unpacked** → select the cloned folder
- Click the icon to open the dashboard, add the keywords you want watched, and start monitoring

That's it. No keys, no build step, no dependencies.

### Optional: paid news APIs

For broader coverage than public RSS gives you, two fallbacks can be switched on by replacing the placeholders at the top of `background.js`:

```js
const GNEWS_API_KEY  = 'YOUR_GNEWS_API_KEY';
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY';
const GOOGLE_SEARCH_ENGINE_ID = 'YOUR_SEARCH_ENGINE_ID';
```

Leave them alone and the extension runs on RSS alone, which is the intended default.

## Known limitations

- **Keys live in source constants, not settings.** Turning on the optional APIs means editing `background.js`, which nobody cloning this is going to do. They belong behind a settings panel backed by `chrome.storage` — the clearest next improvement.
- **The regex parser is deliberately narrow.** It handles the tags these feed providers emit. Point it at an unusual feed and it may read nothing rather than fail loudly.
- **`host_permissions` includes `https://*/*`**, which is broader than necessary. It should be narrowed to the feed hosts actually fetched.
- **Verbose console logging throughout.** Useful while building a scraper against feeds you don't control, noisy in a finished product.
- **No tests.** Feed parsing is exactly the kind of logic that deserves fixtures — a saved Atom feed, a saved RSS feed, some malformed input — and it doesn't have them yet.
- **Not on the Chrome Web Store.** Load-unpacked only.

## Background

This started as the monitoring engine inside a larger PR-tracking product and was extracted to stand on its own. The product's web app, auth, and hosted backend are not part of this repo — what's here is the feed monitor, which never depended on any of them.

## License

MIT — see [LICENSE](LICENSE).
