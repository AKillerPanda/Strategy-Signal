# Newly Prompt

Build a mobile app called StrategySignal.

It should be a stock-analysis style dashboard for startup strategy, inspired by Apple Stocks, Robinhood, and TradingView.

Use my external Python API as the backend.

API base URL:
PASTE_YOUR_DEPLOYED_API_URL_HERE

Create these screens:

1. Home Dashboard

Show:

- Strategy Score
- Marketing Strength
- Product Readiness
- Competition Intensity
- Fragmentation Risk
- Best Launch Strategy
- Top Recommendation

1. Strategy Input

Create a form with:

- product features text input
- marketing channels text input
- competitors text input
- milestones text input
- marketing strength slider from 0 to 100
- product readiness slider from 0 to 100
- competition intensity slider from 0 to 100
- Evaluate button

When the user taps Evaluate, send a POST request to:

POST /evaluate

Request body:
{
  "features": ["AI dashboard", "onboarding flow"],
  "channels": ["SEO", "TikTok", "PR"],
  "competitors": ["Competitor A", "Competitor B"],
  "milestones": ["MVP", "Beta launch", "Public launch"],
  "marketing_strength": 70,
  "product_readiness": 65,
  "competition_intensity": 60
}

Display the response using cards, charts, and recommendation panels.

1. Recommendations Feed

Show action recommendations as a vertical feed.

1. Strategy Charts

Show stock-style charts for score history, launch readiness, product readiness, and market pressure.

1. Competitor Watchlist

Show competitors or brand proxies like a stock watchlist with threat score and suggested response.

Design:

- mobile-first
- dark mode
- rounded cards
- bottom tab navigation
- large score number on the home screen
- green/red trend indicators
- clean founder dashboard style
