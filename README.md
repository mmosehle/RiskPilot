# RiskPilot — Master Your Risk

> A professional forex & index trading risk management system built for South African traders. Manage risk in **ZAR or USD**, track your trades, and analyse your performance — all in one dark-themed web app.

---

## Screenshot

![RiskPilot Logo](https://i.imgur.com/placeholder.png)

---

## Features

### Risk Calculator
- Set a **weekly trading budget** — automatically divided by 5 to give you a daily limit
- Supports all **8 major forex pairs**: EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, USD/CAD, NZD/USD, EUR/GBP
- Supports **NAS100 (Nasdaq)**, **US30 (Dow Jones)**, and **GOLD (XAU/USD)**
- **Live market prices** fetched automatically, refreshed every 60 seconds
- Choose between two setup types:
  - **High Precision** — risks 100% of the daily budget (for A+ setups only)
  - **Standard** — risks 50% of the daily budget (leaves room for a second trade)
- Automatically calculates:
  - Lot size
  - Stop Loss distance (pips / points)
  - Take Profit distance (pips / points)
  - Potential profit in ZAR or USD
  - Risk-to-Reward ratio (colour-coded: green ≥ 2:1, blue ≥ 1:1, red < 1:1)
- **Daily budget lock** — once your daily budget is fully used, the system blocks further trading with a clear banner

### Currency Toggle
- Switch between **ZAR (South African Rand)** and **USD (US Dollar)** at any time
- All values (budget, risk, profit, P&L, wallet) convert instantly
- Live **USD/ZAR** rate is fetched alongside market prices

### Trade Journal
- Every logged trade is saved to the journal automatically
- Columns: Instrument, Date, Setup Type, Direction, Outcome, R:R Ratio, P&L
- Attach **before and after screenshot URLs** to any trade entry
- Add personal notes to each entry

### Weekly Return Wallet
- Winning trades add **risk amount + profit** to the wallet
- Wallet balance displays in the sidebar and on the calendar tab
- Resets when you enter a new weekly budget

### P&L Calendar
- Visual month-by-month calendar showing daily profit/loss
- **Green days** = net profit, **Red days** = net loss, **Gold border** = today
- Navigate between months with arrow buttons
- Summary panel shows:
  - Weekly Return Wallet
  - Win Rate
  - Total Wins / Losses
  - Total Profit, Total Loss, Net P&L
  - Best and worst trading day of the month

### Mobile Responsive
- Fully responsive layout — works on phones, tablets, and desktops
- Mobile hamburger menu with slide-in sidebar
- Optimised touch targets and font sizes for smaller screens
- Add to Home Screen on iOS/Android for an app-like experience

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, CSS Grid, Flexbox) |
| Logic | Vanilla JavaScript (ES2020) |
| Fonts | Inter via Google Fonts |
| Prices | Anthropic API (claude-sonnet) + web search |
| Hosting | GitHub Pages (recommended) |

No frameworks. No build tools. No dependencies. Just three files.

---

## File Structure

```
riskpilot/
├── index.html   — Page structure and all HTML tabs
├── style.css    — Dark theme, layout, mobile responsive styles
├── app.js       — All trading logic, calculations, live prices
└── README.md    — This file
```

---

## How to Run Locally

1. Download or clone the three files into a single folder
2. Double-click `index.html` to open in any modern browser
3. That's it — no server, no install, no build step required

> **Note:** Live prices require an internet connection. If offline, the system uses built-in fallback prices automatically.

---

## How to Deploy (GitHub Pages — Free)

### Step 1 — Create a GitHub account
Go to [github.com](https://github.com) and sign up for a free account.

### Step 2 — Create a new repository
- Click **+** → **New repository**
- Name it `riskpilot` (or anything you like)
- Set visibility to **Public** *(required for free GitHub Pages)*
- Check **"Add a README file"**
- Click **Create repository**

### Step 3 — Upload your files
- Click **Add file** → **Upload files**
- Drag and drop `index.html`, `style.css`, and `app.js`
- Click **Commit changes**

### Step 4 — Enable GitHub Pages
- Go to **Settings** → **Pages**
- Under Source, select **Deploy from a branch**
- Branch: **main**, Folder: **/ (root)**
- Click **Save**

### Step 5 — Access your live site
After 1–3 minutes your site will be live at:
```
https://yourusername.github.io/riskpilot
```

### Updating files in future
- Open the file on GitHub → click the **pencil icon** → edit → **Commit changes**
- GitHub Pages automatically re-deploys within ~2 minutes

---

## How to Use

### 1. Set your weekly budget
Enter your weekly trading budget and click **Set Budget**. The system divides it by 5 to calculate your daily limit.

### 2. Choose a currency
Use the **ZAR / USD** toggle in the sidebar to switch your display currency at any time.

### 3. Set up a trade
- Select your instrument (forex pair, index, or gold)
- Check the live market price
- Enter your Entry, Stop Loss, and Take Profit prices
- Choose **High Precision** or **Standard** setup type

### 4. Review and log
The system instantly calculates your lot size, distances, potential profit, and R:R ratio. Click **Log Trade** to save it to the journal.

### 5. Record the outcome
After your trade closes, click **Mark Win** or **Mark Loss**. Wins automatically add to your Weekly Return Wallet.

### 6. Review your performance
Visit the **P&L Calendar** tab to see your daily results, win rate, and overall performance stats.

---

## Instrument Calculation Notes

| Instrument | Unit | Lot Size Basis |
|------------|------|----------------|
| Forex pairs | Pips | $10 per pip per standard lot (USD pairs) |
| NAS100 / US30 | Points | $1 per point per micro-lot |
| Gold (XAU/USD) | Points | $100 per oz per standard lot |

All calculations convert to ZAR using the live USD/ZAR rate.

---

## Limitations & Notes

- **Trade data is stored in memory only** — refreshing the page clears all journal entries. To persist data permanently, consider copying the project into a full web app with a database backend.
- Live prices depend on the Anthropic API being available. If unavailable, realistic fallback prices are used.
- Lot size calculations are simplified for educational/planning purposes. Always verify with your broker's own calculator before placing a live trade.
- This tool is for **risk management planning only** — it does not place or manage actual trades.

---

## Disclaimer

RiskPilot is a risk planning and journaling tool. It does not constitute financial advice. Trading forex, indices, and commodities carries a high level of risk and may not be suitable for all investors. Always trade responsibly and within your means.

---

## Licence

MIT — free to use, modify, and distribute.

---

*Built for South African traders. Master Your Risk.*
