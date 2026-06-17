# 🎬 StreamFlix

> ⚠️ **This project is a work in progress and is not finished.** Many features are incomplete, unstable, or may break without warning. Use at your own risk.

A self-hosted, Netflix-style live stream aggregator. Browse and watch live streams from your configured sources through a cinematic dark UI — no subscription, no ads, fully under your control.

![Status](https://img.shields.io/badge/status-work%20in%20progress-orange)
![Node](https://img.shields.io/badge/node-v18%2B-green)
![License](https://img.shields.io/badge/license-private-red)

---

## 📸 What It Looks Like

- Dark Netflix-style homepage with hero banner and channel rows
- Hover effects on channel cards
- Full-screen video player with source switcher
- Hidden admin panel for managing everything

---

## ✅ What Works

- Netflix-style homepage with hero banner, category rows, and hover cards
- Full-screen player with HLS (`.m3u8`), iframe embeds, and direct video support
- Auto-fullscreen and unmute on stream open
- Admin panel (password protected) to add/edit/delete streams, categories, and source sites
- Multiple mirror sources per channel with in-player source switcher
- Auto-sync system that scrapes stream URLs from source websites using Puppeteer
- 45-minute scheduled auto-sync
- Manual sync button per source site
- SQLite database — zero config, file-based
- Frontend and backend combined into one server

---

## ⚠️ What Is Not Finished

- **Auto-sync is unreliable** — DaddyLive and similar sites load stream URLs via JavaScript, making automated extraction inconsistent. Sometimes it works, sometimes it doesn't.
- **No user accounts** — everyone who visits the site can watch everything. There is no login for viewers.
- **No stream health checking** — there is no automatic detection of broken streams.
- **No mobile-optimized UI** — the interface works on mobile but is not fully responsive.
- **Admin panel has no confirmation on bulk actions** — be careful when deleting.
- **No search or filtering** — channels can only be browsed by category.
- **Deployment to Railway is partially broken** — Puppeteer/Chrome does not work on Railway's free tier. Auto-sync only works when running locally.
- **No EPG (Electronic Program Guide)** — no schedule or now-playing info.
- **Error handling is minimal** — broken streams show a gray box with no message.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Video Player | HLS.js |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Scraper | Puppeteer |
| Scheduler | node-cron |
| Deployment | Railway (partial) |

---

## 🚀 Running Locally

### Prerequisites
- Node.js v18 or higher
- Git

### Setup

```bash
# Clone the repo
git clone https://github.com/YOURUSERNAME/streamflix.git
cd streamflix

# Install and build frontend
cd frontend
npm install
npm run build
cd ..

# Install backend
cd backend
npm install
```

### Configure

Create `backend/.env`:

```env
PORT=3001
FRONTEND_URL=http://localhost:3001
JWT_SECRET=your-secret-key-here
ADMIN_PASSWORD=your-password-here
```

### Run

```bash
cd backend
npm run dev
```

Open **http://localhost:3001**

Admin panel is at **http://localhost:3001/admin**

---

## 🔑 Admin Panel

The admin panel is a hidden backdoor route. Default credentials are printed in the terminal on first run.

From the admin panel you can:
- Add, edit, and delete streams
- Add mirror sources per stream
- Manage categories
- Add source websites with custom CSS selectors
- Trigger a manual sync of all source sites
- Update individual stream URLs quickly

---

## 📡 Adding Streams

1. Go to `/admin` and log in
2. Add a **Category** (e.g. Sports, News)
3. Add a **Source Site** with the site's base URL, channel list path, and CSS selector
4. Add a **Stream** — set the title to match the source site's channel name exactly for auto-sync to work
5. Set **Source Website** to the source site's domain so the scraper knows which streams belong to it
6. Trigger **↻ Sync** to auto-fetch the stream URL

### Finding a stream URL manually

If auto-sync doesn't work:
1. Open the channel page in your browser
2. Press `F12` → Network tab → filter by `.m3u8`
3. Reload the page
4. Copy the `.m3u8` URL
5. Paste it using the **Update URL** button in the admin panel

---

## 🔄 Auto-Sync

The scraper visits each source site's channel list, matches channels to your configured streams by name, then uses Puppeteer to open each channel page and intercept the `.m3u8` network request.

**Known limitations:**
- Only works when running locally (Railway deployment doesn't support Chrome on free tier)
- Some sites use token-based URLs that expire quickly
- Name matching is fuzzy and may miss channels if names differ between your database and the source site

---

## 📁 Project Structure

```
streamflix/
├── backend/
│   ├── server.js          # Express server + static frontend serving
│   ├── database.js        # SQLite setup
│   ├── scraper.js         # Puppeteer auto-sync
│   ├── routes/
│   │   ├── streams.js     # Public stream API
│   │   ├── admin.js       # Protected admin API
│   │   └── auth.js        # JWT login
│   └── middleware/
│       └── authMiddleware.js
├── frontend/
│   └── src/
│       ├── components/    # Navbar, HeroBanner, StreamCard, PlayerModal, etc.
│       ├── pages/         # Home, Admin
│       └── utils/         # API helper
├── package.json           # Root build scripts
└── README.md
```

---

## ⚖️ Legal

This project does not host, store, or distribute any video content. It is a self-hosted interface that aggregates links to streams from third-party websites.

**You are solely responsible for ensuring that any streams you add comply with the terms of service of the source website and applicable copyright law in your jurisdiction.**

The author provides this tool for educational and personal use only.

---

## 🗺️ Planned (Maybe)

- [ ] Fix auto-sync reliability on hosted servers
- [ ] Stream health checker that auto-hides broken streams
- [ ] Mobile responsive UI
- [ ] Search and filtering
- [ ] Viewer password protection
- [ ] EPG / schedule support
- [ ] Multi-user admin accounts

---

> Built with way too many hours of debugging Puppeteer on Railway. Still not done.
