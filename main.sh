#!/bin/bash
set -e  # Exit on error

echo "🚀 Starting trading data download and HTML generation..."
echo ""

# Download trading data from UEX API
echo "📥 Downloading trading data from UEX API..."

if ! curl -f -s -L \
  -H "User-Agent: Mozilla/5.0 (compatible; SCPages/1.0)" \
  -H "Accept: application/json" \
  "https://api.uexcorp.space/2.0/commodities_prices_all" > prices.json; then
    echo "  ❌ Failed to download prices.json"
    exit 1
fi
echo "  ✓ prices.json"

if ! curl -f -s -L \
  -H "User-Agent: Mozilla/5.0 (compatible; SCPages/1.0)" \
  -H "Accept: application/json" \
  "https://api.uexcorp.space/2.0/star_systems" > systems.json; then
    echo "  ❌ Failed to download systems.json"
    exit 1
fi
echo "  ✓ systems.json"

if ! curl -f -s -L \
  -H "User-Agent: Mozilla/5.0 (compatible; SCPages/1.0)" \
  -H "Accept: application/json" \
  "https://api.uexcorp.space/2.0/terminals" > terminals.json; then
    echo "  ❌ Failed to download terminals.json"
    exit 1
fi
echo "  ✓ terminals.json"

echo ""
echo "🔧 Generating HTML from data..."

# Run the Node.js script to generate HTML
node transform.js

echo ""
echo "✅ Done! Open index.html in your browser to view the results."
