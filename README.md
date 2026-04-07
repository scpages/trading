# Star Citizen Trading Data Generator

This repository contains scripts to fetch and process Star Citizen trading data from the UEX Corp API and generate a static HTML page.

## Usage

```bash
chmod +x main.sh
./main.sh
```

This will:
1. Download trading data from UEX Corp API (prices, systems, terminals)
2. Process the data and generate an HTML page with trading routes and profit calculations
3. Output `index.html` and `default.css`

## Requirements

- Node.js (v18+)
- curl

## Data Source

Data is sourced from [UEX Corp](https://uexcorp.space/) API.

## Generated Files

- `index.html` - Trading data visualization
- `default.css` - Stylesheet
- `prices.json`, `systems.json`, `terminals.json` - Raw data (temporary)

## License

See LICENSE file.
