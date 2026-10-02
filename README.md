# Two Sisters Tampa — Landing Page

A static, no-build landing page (HTML/CSS/vanilla JS only). No server, database,
or framework required — which is what makes it free to host and fast to load.

```
two-sisters-site/
├── index.html      ← homepage: feature sections, each with a small swipeable
│                      image carousel + elegant caption overlay
├── menu.html       ← full menu with prices, incl. the new Mâm Cúng section
├── css/style.css   ← shared styles for both pages
├── js/script.js    ← EN/VI language switch, mini-carousel logic, quote form
├── images/         ← logo.png, hero.svg, and one folder per section (1.svg/2.svg/3.svg placeholders)
└── README.md
```

## 0. Swapping in your own photos

Every feature section on `index.html` shows a small 3-photo carousel with a
caption over each image, currently filled with dashed-border placeholders.
Images live one folder per section: `images/cakes/`, `images/sweet-table/`,
`images/mini-pastries/`, `images/bong-lan/`, `images/signature/`,
`images/matcha-bar/`, `images/coffee-bar/`, `images/mam-cung/`, `images/events/`
— each with `1.svg`, `2.svg`, `3.svg`.

To add a real photo: drop it into the matching folder (e.g.
`images/cakes/1.jpg`) and update that `<img src="...">` in `index.html`. Square
or 4:3 photos (~1200×900px) work best; compress first at
https://squoosh.app (free).

## 0.5 Vietnamese / English toggle

Both pages have an **EN / VI** switch in the header. It's plain JavaScript with
no dependency: translatable text carries `data-en="…" data-vi="…"` attributes,
and `js/script.js` swaps `textContent` on click, remembering the choice in the
visitor's browser (`localStorage`). To add or edit a translation, find the
element in the HTML and edit its `data-en` / `data-vi` values (and its visible
fallback text, which is the initial English shown before the script runs).

Menu item names, flavors, and ingredient tags are currently shown in
English/loanword form only (common on bilingual dessert menus) to keep the
file size and translation workload manageable — headings, descriptions, buttons,
the quote form, and the whole new Mâm Cúng section are fully bilingual. Extend
further sections the same way if you'd like full item-level translation.

## 0. Swapping in your own photos

Every section on `index.html` currently shows a dashed-border placeholder from
`/images` (e.g. `images/cakes.svg`) with alt text describing what should go there.
To add real photos:

1. Drop your photo into `images/` (e.g. `images/cakes.jpg`).
2. In `index.html`, find the matching `<img src="images/cakes.svg" ...>` and change
   the `src` to your new filename. Keep the `alt` text but make it describe the
   real photo.
3. Recommended sizes: the hero image is wide (~1600×1000px looks best), all other
   section images are roughly square (~1200×1200px). Compress photos first at
   https://squoosh.app (free) and save as `.webp` or `.jpg` to keep the page fast.

## 1. Try it locally

Just open `index.html` in a browser, or serve it:

```bash
cd two-sisters-site
python3 -m http.server 8000
# visit http://localhost:8000
```

## 2. The quote form — already wired up (free, no account needed)

The quote form on `menu.html` emails every submission straight to
**cuccu771@gmail.com** using [FormSubmit.co](https://formsubmit.co) — a free
service that needs no account, dashboard, or server. It's already configured:

```html
<form ... action="https://formsubmit.co/cuccu771@gmail.com"
          data-ajax-action="https://formsubmit.co/ajax/cuccu771@gmail.com">
```

**One-time step required:** the very first time the form is submitted (once
the site is live), FormSubmit sends a confirmation email to
cuccu771@gmail.com. Someone must open that email and click **"Confirm my
email"** — until that happens, no submissions (including that first test one)
will arrive. After the one-time confirmation, every future request is
delivered automatically with no further setup.

To send quotes to a different or additional address later, change the email
in both the `action` and `data-ajax-action` attributes in `menu.html` (and
repeat the one-time confirmation for the new address). Each submission
arrives as a formatted table with the sender's name, email, event date, guest
count, and message, subject-lined "New Quote Request — Two Sisters Tampa".

## 3. Deploy for the lowest cost

This site is 100% static, so any of these work and all have a **$0/month** free tier
that's plenty for a small business landing page. Ranked by how little setup they need:

### Option A — Cloudflare Pages (recommended)
Free, unlimited bandwidth, fast global CDN, easy custom domain.
1. Push this folder to a GitHub repo.
2. https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repo. Build command: *(leave blank)*. Build output directory: `/`.
4. Deploy. You get a `*.pages.dev` URL immediately; add your own domain free under
   **Custom domains**.

### Option B — GitHub Pages
Free forever, simplest if the site already lives in a GitHub repo.
1. Push this folder to a GitHub repo (root of the repo, or a `/docs` folder).
2. Repo → **Settings → Pages → Deploy from a branch** → pick `main` and `/ (root)`.
3. Your site is live at `https://<username>.github.io/<repo>` in a minute or two.
4. Optional: add a `CNAME` file with your domain for a free custom domain.

### Option C — Netlify
Free tier, drag-and-drop deploy, good if you want deploy previews per change.
1. https://app.netlify.com/drop → drag the `two-sisters-site` folder in.
2. Or connect the GitHub repo for auto-deploys on every push.

**No build step is needed for any of the three** — this keeps deploys instant and
avoids any paid CI minutes.

## 4. Add a custom domain (optional, ~$10–15/year)

The only real cost in this whole stack is the domain name itself (hosting, CDN,
and SSL are free with any option above). Buy the domain from any registrar
(Cloudflare Registrar has no markup) and point it at your host following that
host's "Custom domains" docs.

## 5. Why this stays fast and cheap

- No framework/build tooling — nothing to compile, nothing to break between
  Node versions.
- Only one external dependency: Google Fonts (loaded with `preconnect` for
  speed); everything else is inline CSS/JS in this repo.
- No images yet — if you add photos, compress them (e.g. https://squoosh.app,
  free) and use `.webp` to keep the page fast on mobile data.
- Static hosts on the CDNs above cache and serve the page from edge locations
  worldwide, so it stays fast without any server to maintain or scale.

## 6. Customizing content

All menu content lives directly in `index.html` — update prices, flavors, or
add sections by copying an existing `<section>` block. Styling and the color
tokens (`--matcha`, `--sakura`, `--plum`, etc.) are all in `css/style.css`.
