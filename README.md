# ISM IHSM Timetable Viewer

A fast, beautiful, real-time timetable viewer for ISM (International School of Medicine) IHSM students. Built to replace the slow official site with an instant-loading, modern UI.

## Features

- ⚡ **Instant loading** — Proxy-based API calls avoid CORS and cache responses
- 📅 **Week grid view** — Visual weekly timetable with color-coded subjects
- 📋 **List view** — Sorted day-by-day schedule view
- 🔄 **Always up-to-date** — Fetches live data from the ISM backend on every load
- 🌙 **Dark mode UI** — Easy on the eyes
- 📱 **Mobile friendly** — Responsive design

## Deploy to Vercel (via GitHub)

### 1. Push to GitHub

```bash
# Create a new repo on github.com, then:
git init
git add .
git commit -m "Initial commit: ISM Timetable Viewer"
git remote add origin https://github.com/YOUR_USERNAME/ism-timetable.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New → Project"**
3. Import your `ism-timetable` repository
4. Click **Deploy** — Vercel auto-detects Next.js

Your app will be live at `https://ism-timetable.vercel.app`

## Finding the Correct API Endpoints

After deploying, visit `/debug` on your app URL to auto-test which API endpoints work.
The debug page will show you which endpoints return data (green ✅) vs fail (red ❌).

Once you find the working endpoints, update `pages/index.js`:
- In the `useEffect` for groups → update the `endpoints` array
- In `fetchSchedule` → update the `endpoints` array

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Next.js 14** — React framework
- **Vercel** — Hosting & serverless functions
- **ISM timetable.ism.edu.kg** — Data source (proxied via `/api/proxy`)

## How it Works

The app uses Next.js API routes as a proxy server. When you select a semester/group:
1. Your browser calls `/api/proxy?path=TimeTable/GetGroups&...`
2. Vercel's serverless function forwards this to `timetable.ism.edu.kg`
3. The response is returned to your browser — **no CORS issues, fast**

Data is cached for 60 seconds on Vercel's edge network for extra speed.
