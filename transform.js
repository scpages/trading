const fs = require('fs');

console.log('📊 Processing trading data...');

// Load JSON files
const pricesData = JSON.parse(fs.readFileSync('prices.json', 'utf8'));
const systemsData = JSON.parse(fs.readFileSync('systems.json', 'utf8'));
const terminalsData = JSON.parse(fs.readFileSync('terminals.json', 'utf8'));

// Process data
console.log('  ✓ Data files loaded');

// Convert numbers to proper types
pricesData.data.forEach(item => {
    item.price_buy = Number(item.price_buy);
    item.price_buy_avg = Number(item.price_buy_avg);
    item.price_sell = Number(item.price_sell);
    item.price_sell_avg = Number(item.price_sell_avg);
    item.scu_buy = Number(item.scu_buy);
    item.scu_buy_avg = Number(item.scu_buy_avg);
    item.scu_sell_stock = Number(item.scu_sell_stock);
    item.scu_sell_stock_avg = Number(item.scu_sell_stock_avg);
    item.scu_sell = Number(item.scu_sell);
    item.scu_sell_avg = Number(item.scu_sell_avg);
});

// Build system lookup
const systemsLookup = systemsData.data.reduce((acc, item) => {
    acc[item.id] = { name: item.name, code: item.code };
    return acc;
}, {});

// Build terminal to system mapping
const terminalToSystem = terminalsData.data.reduce((acc, item) => {
    acc[item.nickname] = systemsLookup[item.id_star_system];
    return acc;
}, {});

console.log('  ✓ Lookups created');

// Get unique commodities
const uniqueCommodities = [...new Set(pricesData.data.map(item => item.commodity_name))];

// Helper functions
function readableNumber(num) {
    if (num === '-') return num;
    return new Intl.NumberFormat("en-US", { useGrouping: true }).format(num).replace(/,/g, " ");
}

function genDataSell() {
    const commodities = {};
    pricesData.data.forEach(item => {
        const { commodity_name, container_sizes, terminal_name, price_sell, price_sell_avg, scu_sell, scu_sell_avg } = item;
        let system = terminalToSystem?.[terminal_name]?.code ?? "(?) ";
        if (system !== "(?) ") system = "(" + system + ") ";
        if (price_sell === 0) return;
        if (!commodities[commodity_name]) commodities[commodity_name] = [];
        commodities[commodity_name].push({
            terminal_name: system + terminal_name,
            container_sizes,
            price_sell: price_sell > 0 ? price_sell : null,
            price_sell_avg: price_sell_avg > 0 ? price_sell_avg : null,
            scu_sell: scu_sell > 0 ? scu_sell : null,
            scu_sell_avg: scu_sell_avg > 0 ? scu_sell_avg : null,
        });
    });
    return commodities;
}

function genDataBuy() {
    const commodities = {};
    pricesData.data.forEach(item => {
        const { commodity_name, container_sizes, terminal_name, price_buy, price_buy_avg, scu_buy, scu_buy_avg } = item;
        let system = terminalToSystem?.[terminal_name]?.code ?? "(?) ";
        if (system !== "(?) ") system = "(" + system + ") ";
        if (price_buy === 0) return;
        if (!commodities[commodity_name]) commodities[commodity_name] = [];
        commodities[commodity_name].push({
            terminal_name: system + terminal_name,
            container_sizes,
            price_buy: price_buy > 0 ? price_buy : null,
            price_buy_avg: price_buy_avg > 0 ? price_buy_avg : null,
            scu_buy: scu_buy > 0 ? scu_buy : null,
            scu_buy_avg: scu_buy_avg > 0 ? scu_buy_avg : null,
        });
    });
    return commodities;
}

function displayTerminal(item) {
    const price = (item.price_buy || 0) + (item.price_sell || 0);
    const price_avg = (item.price_buy_avg || 0) + (item.price_sell_avg || 0);
    const stock = (item.scu_buy || 0) + (item.scu_sell || 0);
    const stock_avg = (item.scu_buy_avg || 0) + (item.scu_sell_avg || 0);
    return `<tr><td title="${item.container_sizes}">${item.terminal_name}</td><td>${readableNumber(price)} (~${readableNumber(price_avg)})</td><td>${readableNumber(stock)} (~${readableNumber(stock_avg)})</td></tr>`;
}

function displayPricing(pricings, stockDemand) {
    let noPrices = '';
    if (pricings.length === 0) noPrices = '<tr><td>-</td><td>-</td><td>-</td></tr>';
    return '<tr><th>Location</th><th>Price (avg)</th><th>' + stockDemand + ' (avg)</th></tr>' + noPrices + pricings.map(terminal => displayTerminal(terminal)).join('');
}

const profitData = [];

function displayCommodity(commodity, buy = [], sell = []) {
    let buySorted = buy.sort((a, b) => a.price_buy - b.price_buy);
    let sellSorted = sell.sort((a, b) => b.price_sell - a.price_sell);

    const sellSortedReal = sell.filter(item => item.scu_sell_avg !== null && item.scu_sell_avg !== 0);
    const buySortedReal = buy.filter(item => item.scu_buy_avg !== null && item.scu_buy_avg !== 0);

    let profitUecTxt = '';
    let profitPercTxt = '';
    if (sellSorted.length > 0 && buySorted.length > 0) {
        const profitUec = (sellSorted[0].price_sell - buySorted[0].price_buy);
        const profitPerc = (((sellSorted[0].price_sell - buySorted[0].price_buy) / buySorted[0].price_buy) * 100).toFixed(2);

        let profitUecReal = '-';
        let profitPercReal = '-';
        if (sellSortedReal.length > 0 && buySortedReal.length > 0) {
            profitUecReal = (sellSortedReal[0].price_sell - buySortedReal[0].price_buy);
            if (profitUecReal < 0) profitUecReal = '-';
            profitPercReal = (((sellSortedReal[0].price_sell - buySortedReal[0].price_buy) / buySortedReal[0].price_buy) * 100).toFixed(2);
            if (profitPercReal < 0) profitPercReal = '-';
        }

        profitUecTxt = profitUec + ' aUEC - ';
        profitPercTxt = profitPerc + '%';

        profitData.push({
            commodity,
            profit_uec: profitUec,
            profit_perc: profitPerc,
            profit_uec_real: profitUecReal,
            profit_perc_real: profitPercReal
        });
    }

    let dealsList = [];
    let dealsListAvg = [];
    const terminalsSell = pricesData.data.filter(comm => comm.commodity_name === commodity && comm.price_sell_avg > 0);
    const terminalsBuy = pricesData.data.filter(comm => comm.commodity_name === commodity && comm.price_buy_avg > 0);

    terminalsSell.forEach(sell => {
        terminalsBuy.forEach(buy => {
            let amount = sell.scu_sell;
            if (amount > buy.scu_buy) amount = buy.scu_buy;
            dealsList.push({
                profit: (sell.price_sell - buy.price_buy) * amount,
                investment: buy.price_buy * amount,
                amount,
                buy,
                sell
            });
        });
    });

    terminalsSell.forEach(sell => {
        terminalsBuy.forEach(buy => {
            let amount = sell.scu_sell_avg;
            if (amount > buy.scu_buy_avg) amount = buy.scu_buy_avg;
            dealsListAvg.push({
                profit: (sell.price_sell_avg - buy.price_buy_avg) * amount,
                investment: buy.price_buy_avg * amount,
                amount,
                buy,
                sell
            });
        });
    });

    const profitSorted = dealsList.sort((a, b) => b.profit - a.profit).slice(0, 1);
    const profitSortedAvg = dealsListAvg.sort((a, b) => b.profit - a.profit).slice(0, 1);
    let bestProfit = '';
    let bestRoute = '';

    if (profitSorted.length > 0) {
        bestProfit = `( ${profitUecTxt} ${profitPercTxt} )`;
        bestRoute = `<tr><td title="Most profitable trip based on latest reported data">(${terminalToSystem?.[profitSorted[0].buy.terminal_name]?.code ?? "?"}) ${profitSorted[0].buy.terminal_name} -> (${terminalToSystem?.[profitSorted[0].sell.terminal_name]?.code ?? "?"}) ${profitSorted[0].sell.terminal_name}</td><td style="text-align:right;" title="Profit from the trip">${readableNumber(profitSorted[0].profit)} aUEC</td><td style="text-align:right;" title="Amount of SCU to trade">${readableNumber(profitSorted[0].amount)} SCU</td><td style="text-align: right; padding-right: 1rem;" title="Required aUEC investment">( ${readableNumber(profitSorted[0].investment)} aUEC )</td></tr>
        <tr><td title="Most profitable trip based on average data">(${terminalToSystem?.[profitSortedAvg[0].buy.terminal_name]?.code ?? "?"}) ${profitSortedAvg[0].buy.terminal_name} -> (${terminalToSystem?.[profitSortedAvg[0].sell.terminal_name]?.code ?? "?"}) ${profitSortedAvg[0].sell.terminal_name}</td><td style="text-align:right;" title="Profit from the trip">~ ${readableNumber(profitSortedAvg[0].profit)} aUEC</td><td style="text-align:right;" title="Amount of SCU to trade">~ ${readableNumber(profitSortedAvg[0].amount)} SCU</td><td style="text-align: right; padding-right: 1rem;" title="Required aUEC investment">( ~ ${readableNumber(profitSortedAvg[0].investment)} aUEC )</td></tr>`;
    }

    return `
    <table class="commodity" id="comm-${commodity}">
        <tr><th colspan="4" style="text-align:center;">${commodity} ${bestProfit}</th></tr>
        ${bestRoute}
        <tr>
            <td colspan="2">(you) Sell</td>
            <td colspan="2">(you) Buy</td>
        </tr>
        <tr>
            <td colspan="2">
                <table>
                    ${displayPricing(sellSorted, 'Demand')}
                </table>
            </td>
            <td colspan="2">
                <table>
                    ${displayPricing(buySorted, 'In stock')}
                </table>
            </td>
        </tr>
    </table>
    `;
}

console.log('  ✓ Processing commodities...');

const sellPrices = genDataSell();
const buyPrices = genDataBuy();
const tables = uniqueCommodities.map(commodity => displayCommodity(commodity, buyPrices[commodity], sellPrices[commodity])).join('');

// Generate profit tables
profitData.sort((a, b) => b.profit_uec - a.profit_uec);
const profitUecHeader = '<tr><th>Commodity</th><th>Profit aUEC/SCU</th></tr>';
const profitUecData = profitData.map(item =>
    `<tr><td><a href="#comm-${item.commodity}">${item.commodity}</a></td><td>${readableNumber(item.profit_uec_real)} (up to ${readableNumber(item.profit_uec)})</td></tr>`
).join('');
const profitUecTable = '<table class="best">' + profitUecHeader + profitUecData + '</table>';

profitData.sort((a, b) => b.profit_perc - a.profit_perc);
const profitPercHeader = '<tr><th>Commodity</th><th>Profit %</th></tr>';
const profitPercData = profitData.map(item =>
    `<tr><td><a href="#comm-${item.commodity}">${item.commodity}</a></td><td>${item.profit_perc_real} (up to ${item.profit_perc})</td></tr>`
).join('');
const profitPercTable = '<table class="best">' + profitPercHeader + profitPercData + '</table>';

console.log('  ✓ Generated profit tables');

// Generate HTML
const html = `<!DOCTYPE html>
<html>
    <head>
        <title>ComTrading - Star Citizen</title>
        <link rel="stylesheet" type="text/css" href="default.css" media="screen" >
        <meta http-equiv="refresh" content="300">
    </head>
    <body>
<div id="content"> <div id="panel_l">
${profitUecTable}
</div> <div id="panel_r">
${profitPercTable}
</div> <div id="main">
${tables}
</div></div>
<footer>
    <p>Data sourced from <a href="https://uexcorp.space/" target="_blank">UEX Corp</a> API | Auto-updates every 15 minutes</p>
    <p><a href="https://scpages.github.io/">SCPages</a> | <a href="https://github.com/scpages/trading" target="_blank">GitHub</a></p>
</footer>
    </body>
</html>
`;

// Write HTML file
fs.writeFileSync('index.html', html);
console.log('  ✓ Generated index.html');

// Generate CSS file
const css = `body
    {
    min-width: 92rem;
    color: white;
    background-color: #121212;
    font-family: Open Sans;
    font-size: 1rem;
    }
table
    {
    background-color: #1e1e1e;
    flex-shrink: 0;
    }
table.commodity
    {
    margin-top: 2rem;
    margin-bottom: 0rem;
    margin-left: auto;
    margin-right: auto;
    float: left;
    border-radius: 0.5rem;
    box-shadow: 0.15rem 0.15rem 0.15rem rgba(50, 50, 50, 0.5);
    min-width: 45rem;
    }
table.best
    {
    margin-top: 1rem;
    margin-left: auto;
    margin-right: auto;
    border-radius: 0.5rem;
    box-shadow: 0.15rem 0.15rem 0.15rem rgba(50, 50, 50, 0.5);
    }
table.best tbody tr
    {
    }

th
    {
    background-color: #006fdd;
    color: #fff;
    padding: 5px;
    border-radius: 5px;
    }
td
    {
    text-align: center;
    vertical-align: top;
    }

a
    {
    text-decoration: none;
    color: inherit;
    outline: none;
    }
a:hover
    {
    color: #006fdd;
    }


div#content
    {
    width: 100%;
    }

div#main
    {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: flex-start;
    }

div#panel_r
    {
    float: right;
    }

div#panel_l
    {
    float: left;
    }

:target tbody tr th {
    background-color: goldenrod;
}

footer
    {
    clear: both;
    text-align: center;
    padding: 2rem 1rem;
    margin-top: 3rem;
    color: #888;
    font-size: 0.9rem;
    border-top: 1px solid #333;
    }

footer p
    {
    margin: 0.5rem 0;
    }

footer a
    {
    color: #006fdd;
    text-decoration: none;
    }

footer a:hover
    {
    text-decoration: underline;
    }
`;

fs.writeFileSync('default.css', css);
console.log('  ✓ Generated default.css');

console.log('✅ All files generated successfully!');
