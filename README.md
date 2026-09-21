# Cargo Trading

Fetches commodity price data from the [UEX Corp API](https://uexcorp.space) and generates a static HTML page with trading routes and profit calculations.

Live at: **https://scpages.github.io/trading/**

## Workflow

```bash
bash main.sh
```

Fetches fresh data from the UEX Corp API (prices, systems, terminals), processes it, and generates `index.html`.

## Data Sources

- [UEX Corp API](https://api.uexcorp.space/2.0/) — commodity prices, star systems, terminals
