# Vault — Personal Finance Tracker

A minimal, dark-themed personal finance web app built for a cybersecurity student and entrepreneur.

## Features
- Log income and expenses with date, category, and description
- Interactive donut chart dashboard with hover tooltips
- 5-bucket money system (Daily living 30%, Invest 20%, Emergency 10%, Business 20%, Growth 10%)
- Month-by-month history with category breakdowns
- Goal tracker with progress bars
- Fully offline — data saves in your browser's localStorage
- Works on phone and laptop

## How to host on GitHub Pages (free)

1. Create a new GitHub repository — name it anything (e.g. `vault-finance`)
2. Upload all 4 files: `index.html`, `style.css`, `app.js`, `README.md`
3. Go to **Settings → Pages**
4. Under **Source**, select `Deploy from a branch`
5. Select `main` branch and `/ (root)` folder
6. Click **Save**
7. Wait 1–2 minutes. Your app is live at:
   `https://YOUR-GITHUB-USERNAME.github.io/vault-finance/`

Bookmark this URL on your phone and laptop. Done.

## Files
```
index.html   — App structure and pages
style.css    — Dark minimal design system
app.js       — All logic, state, storage
README.md    — This file
```

## Data & Privacy
All your data stays in your browser's localStorage — nothing is sent anywhere. If you clear browser data, transactions are lost. For backup, you can export via browser DevTools → Application → localStorage.

## Buckets
| Bucket | % of income | What it covers |
|--------|------------|----------------|
| Daily living | 30% | Food, travel, skincare, room |
| Invest | 20% | SIP, digital gold |
| Emergency fund | 10% | 3 months buffer |
| Business | 20% | Certs, tools, equipment |
| Personal growth | 10% | Books, courses, events |
