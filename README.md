# 🌠 Near-Earth Object Watch

A single-screen dashboard that visualizes NASA's Near-Earth Object data using [Chart.js](https://www.chartjs.org/). Pulls a live 7-day feed from NASA's **NeoWs API** and charts it as daily asteroid traffic, closest-approach distances, and a radar comparison of the week's four largest objects — all wrapped in a night-sky, observation-log aesthetic.

No build step, no frameworks, no dependencies beyond one CDN script tag.

## ✨ Features

- **Live data** — fetches NASA's NeoWs feed on load, no hardcoded numbers
- **Three chart types** — stacked bar, line, and radar, each chosen to fit its data
- **Single-screen dashboard** — everything fits in one viewport, no scrolling
- **Animated space background** — a pure-CSS starfield with looping falling-star streaks
- **Zero setup** — just open `index.html`, no npm install, no server required

## 📊 The charts

| Chart | Type | What it shows |
|---|---|---|
| Daily asteroid traffic | Stacked bar | Hazardous vs. non-hazardous counts, per day |
| How close did they come? | Line | Closest approach each day, in lunar distances |
| This week's biggest visitors | Radar | Top 4 largest asteroids, compared on size, speed, and proximity |

## 🛠 Built with

- HTML5 + CSS3 (CSS Grid, custom properties, keyframe animations)
- Vanilla JavaScript (`fetch`, no framework)
- [Chart.js](https://www.chartjs.org/) 4.5.1
- [NASA NeoWs API](https://api.nasa.gov/)
- Fraunces & IBM Plex, via Google Fonts

## 🚀 Getting started

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
open index.html   # or just double-click it
```

That's it — no build tools, no package manager. The page fetches live data from NASA's API as soon as it loads.

By default it uses NASA's shared `DEMO_KEY`, which works out of the box but is capped at **30 requests/hour and 50/day per IP**. If you hit that limit, grab a free personal key at [api.nasa.gov](https://api.nasa.gov/) and drop it into the `API_KEY` constant at the top of `script.js`.

### Hosting it live

Since it's a static site, [GitHub Pages](https://pages.github.com/) is the easiest way to put it online: **Settings → Pages → Deploy from branch → main**, and the dashboard is live at `https://<your-username>.github.io/<repo-name>/`.

## 📁 Project structure

```
.
├── index.html   # markup + Chart.js CDN import
├── style.css    # dashboard layout, color tokens, starfield/shooting-star animation
├── script.js    # fetch + data transforms + chart rendering
└── README.md
```

## 🌌 Design notes

The palette leans into a "night-sky observation log" feel: deep plum-navy instead of pure black, warm gold for highlights, and teal/rust-red for the safe/hazardous split. Fraunces gives the headings some editorial personality while IBM Plex keeps the numbers clean and readable. The radar chart's axes are all normalized 0–100 *relative to the four asteroids being compared* — worth knowing if you dig into the code, since it's about relative standing, not absolute values.

## 🙏 Credits

Data via NASA's [Near Earth Object Web Service (NeoWs)](https://api.nasa.gov/), built on asteroid data from the NASA JPL Center for Near-Earth Object Studies. Originally built as a data visualization course project.

## 📄 License

No license has been added yet — until one is, this code defaults to standard copyright (all rights reserved). If you'd like others to freely reuse or modify it, consider adding a permissive license like [MIT](https://choosealicense.com/licenses/mit/).
