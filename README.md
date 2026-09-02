# Vault — Personal Finance Tracker v2

Minimal dark finance tracker. Built for a cybersecurity student and entrepreneur.

## Key logic

**Parent money is separate from earned income.**
- Money from parents goes into your daily living pool directly — it is never split into the 5 buckets.
- Only money YOU earn (classes, freelance, YouTube, bug bounty) gets split across buckets.
- The "Available to spend" number = Parent allowance + 30% of earned income − daily living spent.

## Fully editable everywhere
- **Transactions** — click the ✏ icon to edit any transaction in place (date, category, description, amount)
- **Goals** — click any field on a goal card to edit name, saved amount, target, deadline
- **Buckets** — click bucket name or % on the Dashboard to rename/change allocation
- **Settings page** — add/rename/delete income categories, expense categories, and buckets; change bucket colors and percentages

## Host on GitHub Pages (free)

1. Create a GitHub repo (e.g. `vault-finance`)
2. Upload `index.html`, `style.css`, `app.js`, `README.md`
3. Settings → Pages → Deploy from branch → main → / (root) → Save
4. Live at: `https://YOUR-USERNAME.github.io/vault-finance/`
5. Add to phone home screen: Share → Add to Home Screen (iOS) or Install App (Android Chrome)

## Files
```
index.html   App shell, all 5 pages
style.css    Dark minimal design (Inter + JetBrains Mono)
app.js       All logic, state, localStorage persistence
README.md    This file
```

## Data
Stored in browser localStorage. Use Settings → Export to back up as JSON.
