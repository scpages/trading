#!/bin/bash

echo "🚀 Starting trading data download and HTML generation..."
echo ""

# Download trading data from UEX API
echo "📥 Downloading trading data from UEX API..."

curl -s "https://api.uexcorp.space/2.0/commodities_prices_all" > prices.json
echo "  ✓ prices.json"

curl -s "https://api.uexcorp.space/2.0/star_systems" > systems.json
echo "  ✓ systems.json"

curl -s "https://api.uexcorp.space/2.0/terminals" > terminals.json
echo "  ✓ terminals.json"

echo ""
echo "🔧 Generating HTML from data..."

# Run the Node.js script to generate HTML
node transform.js

echo ""
echo "✅ Done! Open index.html in your browser to view the results."
