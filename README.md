# Signal by ELI

A Chrome extension that tells you when the people and brands you care about get mentioned in the media. It watches **Google News, YouTube, Reddit, and podcast feeds**, polls every five minutes in the background, and collects what it finds into a dashboard.

**Published on the Chrome Web Store.** It needs no API key — the whole thing runs on public RSS.

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

Around that core sits the unglamorous work that makes feed parsing actually hold up: unescaping nested CDATA and HTML entities (`cleanXMLContent`), pulling a readable publisher name out of Google News' redirect URLs (`extractSourceFromLink`), and stripping markup out of descriptions (`cleanDescription`).

**Yes, regex-parsing XML is normally the wrong answer.** It's the right answer here precisely because the platform removed the alternative, and because the input is a narrow, well-formed subset — a handful of known tags from a handful of known providers — rather than arbitrary XML.

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
              chrome.storage.local ──► popup · dashboard
                          │
                          ▼
                 cleanupOldMentions
```

Three surfaces sit on top of that engine:

| Surface | Files | What it does |
|---|---|---|
| **Popup** | `popup.html/js/css` | Quick view — your tracked clients, recent mentions, add a new one |
| **Dashboard** | `dashboard.html/js/css` | Full-page view of everything collected |
| **Onboarding** | `onboarding.html/js/css` | First-run setup, optionally reading your LinkedIn profile to suggest who to track |

Behaviour worth knowing:

- **Polls every 5 minutes**, capped at 20 results per feed, over a rolling 14-day window. Google News returns articles older than the requested range even when you ask for one day, so the window is deliberately wider than the query.
- **Optional APIs degrade silently.** `searchGNews` checks for a configured key and returns early if there isn't one ([`background.js:490`](background.js)) — no errors, no broken UI, the RSS path carries on.
- **Old mentions are pruned** by `cleanupOldMentions` so `chrome.storage.local` doesn't grow without bound.

## Install

From source:

```bash
git clone https://github.com/priyajnvian/signal.git
```

- Open `chrome://extensions/`
- Turn on **Developer mode**
- **Load unpacked** → select the cloned folder

No keys, no build step, no dependencies.

### Optional: paid news APIs

For coverage beyond public RSS, two fallbacks switch on by replacing the placeholders at the top of `background.js`:

```js
const GNEWS_API_KEY  = 'YOUR_GNEWS_API_KEY';
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY';
const GOOGLE_SEARCH_ENGINE_ID = 'YOUR_SEARCH_ENGINE_ID';
```

Leave them alone and it runs on RSS alone, which is the intended default.

## Known limitations

I'd rather you read this than discover it.

- **The LinkedIn onboarding step is broken in this build.** `onboarding.js:139` calls `chrome.scripting.executeScript` to inject `linkedin-scraper.js`, but `manifest.json` never requests the **`scripting`** permission — so that call throws. The scraper itself only reads a single profile page you're already viewing (`/in/…`) to suggest keywords; it is not a bulk scraper. Fixing this means adding the permission, which widens the install prompt, so it's a deliberate open decision rather than an oversight to paper over.
- **Keys live in source constants, not settings.** Turning on the optional APIs means editing `background.js`, which nobody cloning this will do. They belong behind a settings panel backed by `chrome.storage`.
- **`host_permissions` includes `https://*/*`**, broader than necessary. It should be narrowed to the feed hosts actually fetched.
- **The regex parser is deliberately narrow.** It handles the tags these providers emit. Point it at an unusual feed and it may read nothing rather than fail loudly.
- **Verbose console logging throughout** — useful while building against feeds you don't control, noisy in a finished product.
- **No tests.** Feed parsing is exactly the logic that deserves fixtures: a saved Atom feed, a saved RSS feed, some malformed input.

## License

MIT — see [LICENSE](LICENSE).
