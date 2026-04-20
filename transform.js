const fs = require("fs");

// Load JSON files
const ships = JSON.parse(fs.readFileSync("ships.json", "utf-8"));
const powerPlants = JSON.parse(fs.readFileSync("power.json", "utf-8"));
let shields = [];
let coolers = [];
let qdrives = [];
let weapons = [];
let radars = [];

try {
  shields = JSON.parse(fs.readFileSync("shield.json", "utf-8"));
} catch (e) {}

try {
  coolers = JSON.parse(fs.readFileSync("cooler.json", "utf-8"));
} catch (e) {}

try {
  qdrives = JSON.parse(fs.readFileSync("qdrives.json", "utf-8"));
} catch (e) {}

try {
  weapons = JSON.parse(fs.readFileSync("weapons.json", "utf-8"));
} catch (e) {}

try {
  radars = JSON.parse(fs.readFileSync("radars.json", "utf-8"));
} catch (e) {}

// Build lookup maps
function buildMap(items) {
  const map = new Map();
  for (const p of items) {
    if (p.localName) map.set(p.localName, p.data);
    if (p.data?.ref) map.set(p.data.ref, p.data);
  }
  return map;
}

const powerMap = buildMap(powerPlants);
const shieldMap = buildMap(shields);
const coolerMap = buildMap(coolers);
const qdriveMap = buildMap(qdrives);
const weaponMap = buildMap(weapons);
const radarMap = buildMap(radars);

// Recursive search
function findByType(node, type, results = []) {
  if (!node) return results;

  if (node.itemTypes && node.itemTypes.some(t => t.type === type)) {
    const id = node.localName || node.localReference;
    if (id) results.push(id);
  }

  if (node.loadout && Array.isArray(node.loadout)) {
    for (const child of node.loadout) {
      findByType(child, type, results);
    }
  }

  return results;
}

// Find weapons - collect all references and filter for actual weapons later
function findAllReferences(node, results = []) {
  if (!node) return results;

  // Collect localName or localReference from this node
  const id = node.localName || node.localReference;
  if (id) {
    results.push(id);
  }

  // Recursively traverse loadout
  if (node.loadout && Array.isArray(node.loadout)) {
    for (const child of node.loadout) {
      findAllReferences(child, results);
    }
  }

  return results;
}

// Filter references to only include actual weapons
function findWeapons(node, weaponMap) {
  const allRefs = findAllReferences(node);
  const weapons = [];

  for (const ref of allRefs) {
    const item = weaponMap.get(ref);
    if (item && item.type === "WeaponGun") {
      weapons.push(ref);
    }
  }

  return weapons;
}

// Resolve helper
function resolve(ids, map) {
  if (!ids.length) return "-";

  const unique = [...new Set(ids)];

  const resolved = unique
    .map(id => {
      if (!id) return null;
      const match = map.get(id);
      if (!match) return null;

      const name = match.name || match.shortName;
      if (!name) return null;

      // Get class and grade
      const cls = match.class;
      const grade = match.grade;

      // Build class-grade suffix if both exist
      let suffix = "";
      if (cls && grade) {
        const classInitial = cls.charAt(0).toUpperCase();
        suffix = ` (${classInitial}-${grade})`;
      }

      return `${name}${suffix}`;
    })
    .filter(Boolean);

  return resolved.length ? resolved.join(", ") : "-";
}

// Load Wikelo ships
let wikeloShips = [];
try {
  wikeloShips = JSON.parse(fs.readFileSync("ships_wikelo.json", "utf-8")).ships;
  console.log(`✅ Loaded ${wikeloShips.length} Wikelo ships`);
} catch (e) {
  console.log("⚠️  Wikelo ships not found, skipping...");
}

// Load Executive Hangar ships
let execHangarShips = [];
try {
  execHangarShips = JSON.parse(fs.readFileSync("ships_exec-hangar.json", "utf-8")).ships;
  console.log(`✅ Loaded ${execHangarShips.length} Executive Hangar ships`);
} catch (e) {
  console.log("⚠️  Executive Hangar ships not found, skipping...");
}

// Build table rows
let rows = "";

for (const ship of ships) {
  const name = ship?.data?.name || "Unknown";
  const loadout = ship?.data?.loadout || [];

  let powerIds = [];
  let shieldIds = [];
  let coolerIds = [];
  let qdriveIds = [];
  let weaponIds = [];
  let radarIds = [];

  for (const item of loadout) {
    findByType(item, "PowerPlant", powerIds);
    findByType(item, "Shield", shieldIds);
    findByType(item, "Cooler", coolerIds);
    findByType(item, "QuantumDrive", qdriveIds);
    const itemWeapons = findWeapons(item, weaponMap);
    weaponIds.push(...itemWeapons);
    findByType(item, "Radar", radarIds);
  }

  rows += `
    <tr>
      <td class="ship">${name}</td>
      <td>${resolve(powerIds, powerMap)}</td>
      <td>${resolve(shieldIds, shieldMap)}</td>
      <td>${resolve(coolerIds, coolerMap)}</td>
      <td>${resolve(qdriveIds, qdriveMap)}</td>
      <td>${resolve(weaponIds, weaponMap)}</td>
      <td>${resolve(radarIds, radarMap)}</td>
    </tr>
  `;
}

// Build Wikelo ships table rows
let wikeloRows = "";

for (const ship of wikeloShips) {
  const name = ship.name;

  // Group components by type
  const powerPlants = ship.components.filter(c => c.type === "Power Plant");
  const shields = ship.components.filter(c => c.type === "Shield");
  const coolers = ship.components.filter(c => c.type === "Cooler");
  const qdrives = ship.components.filter(c => c.type === "Quantum Drive");
  const weapons = ship.components.filter(c => c.type === "Weapons");

  // Format component display
  const formatComponent = (comp) => {
    const classInitial = comp.class && comp.class !== "NA" && comp.class !== "-" ? comp.class.charAt(0).toUpperCase() : "";
    const suffix = classInitial && comp.grade && comp.grade !== "-" ? ` (${classInitial}-${comp.grade})` : "";
    return `${comp.name}${suffix}`;
  };

  const formatComponents = (comps) => {
    if (!comps.length) return "-";
    return comps.map(formatComponent).join(", ");
  };

  wikeloRows += `
    <tr>
      <td class="ship">${name}</td>
      <td>${formatComponents(powerPlants)}</td>
      <td>${formatComponents(shields)}</td>
      <td>${formatComponents(coolers)}</td>
      <td>${formatComponents(qdrives)}</td>
      <td>${formatComponents(weapons)}</td>
    </tr>
  `;
}

// Build Executive Hangar ships table rows
let execHangarRows = "";

for (const ship of execHangarShips) {
  const name = ship.name;

  // Group components by type
  const powerPlants = ship.components.filter(c => c.type === "Power Plant");
  const shields = ship.components.filter(c => c.type === "Shield");
  const coolers = ship.components.filter(c => c.type === "Cooler");
  const qdrives = ship.components.filter(c => c.type === "Quantum Drive");
  const weapons = ship.components.filter(c => c.type === "Weapons");

  // Format component display
  const formatComponent = (comp) => {
    const classInitial = comp.class && comp.class !== "NA" && comp.class !== "-" ? comp.class.charAt(0).toUpperCase() : "";
    const suffix = classInitial && comp.grade && comp.grade !== "-" ? ` (${classInitial}-${comp.grade})` : "";
    return `${comp.name}${suffix}`;
  };

  const formatComponents = (comps) => {
    if (!comps.length) return "-";
    return comps.map(formatComponent).join(", ");
  };

  execHangarRows += `
    <tr>
      <td class="ship">${name}</td>
      <td>${formatComponents(powerPlants)}</td>
      <td>${formatComponents(shields)}</td>
      <td>${formatComponents(coolers)}</td>
      <td>${formatComponents(qdrives)}</td>
      <td>${formatComponents(weapons)}</td>
    </tr>
  `;
}

// HTML output
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Default Ship Components - Star Citizen</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🚀%3C/text%3E%3C/svg%3E">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
      color: #e8e8e8;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 0;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    header {
      background: rgba(10, 14, 39, 0.8);
      backdrop-filter: blur(10px);
      border-bottom: 2px solid #2a9fd6;
      padding: 20px 0;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }

    h1 {
      color: #ffffff;
      font-size: 2rem;
      font-weight: 600;
      text-align: center;
      text-shadow: 0 0 20px rgba(42, 159, 214, 0.5);
    }

    .subtitle {
      text-align: center;
      color: #a0a0a0;
      font-size: 0.9rem;
      margin-top: 8px;
    }

    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      background: rgba(20, 25, 45, 0.6);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
    }

    th {
      background: linear-gradient(180deg, #1e3a5f 0%, #152840 100%);
      color: #ffffff;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85rem;
      letter-spacing: 0.5px;
      padding: 16px 12px;
      text-align: left;
      border-bottom: 2px solid #2a9fd6;
    }

    td {
      padding: 14px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #d0d0d0;
      font-size: 0.9rem;
    }

    tr:hover {
      background-color: rgba(42, 159, 214, 0.1);
      transition: background-color 0.2s ease;
    }

    tr:last-child td {
      border-bottom: none;
    }

    .ship {
      font-weight: 600;
      color: #2a9fd6;
      font-size: 1rem;
    }

    .footer {
      margin-top: 50px;
      padding: 20px 0;
      border-top: 1px solid rgba(42, 159, 214, 0.3);
      color: #888;
      font-size: 0.85rem;
      text-align: center;
    }

    .footer a {
      color: #2a9fd6;
      text-decoration: none;
      margin: 0 8px;
      transition: color 0.2s ease;
    }

    .footer a:hover {
      color: #4fc3f7;
      text-decoration: underline;
    }

    .section-header {
      background: rgba(42, 159, 214, 0.1);
      border-left: 4px solid #2a9fd6;
      padding: 15px 20px;
      margin: 40px 0 20px 0;
      border-radius: 4px;
    }

    .section-header h2 {
      color: #2a9fd6;
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 5px;
    }

    .section-header p {
      color: #a0a0a0;
      font-size: 0.9rem;
      margin: 0;
    }

    @media (max-width: 768px) {
      table {
        font-size: 0.8rem;
      }

      th, td {
        padding: 10px 8px;
      }

      h1 {
        font-size: 1.5rem;
      }
    }
  </style>
</head>
<body>

  <header>
    <div class="container">
      <h1>Default Ship Components</h1>
      <div class="subtitle">Star Citizen - Default Loadouts Database</div>
    </div>
  </header>

  <div class="container">
    <div class="section-header">
      <h2>Default Ship Components</h2>
      <p>Factory default components as sold in-game</p>
    </div>

    <table>
    <thead>
      <tr>
        <th>Ship</th>
        <th>Power Plants</th>
        <th>Shields</th>
        <th>Coolers</th>
        <th>Quantum Drives</th>
        <th>Weapons</th>
        <th>Radar</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  ${wikeloRows ? `
    <div class="section-header">
      <h2>Wikelo Modified Ships</h2>
    </div>

    <table>
    <thead>
      <tr>
        <th>Ship</th>
        <th>Power Plants</th>
        <th>Shields</th>
        <th>Coolers</th>
        <th>Quantum Drives</th>
        <th>Weapons</th>
      </tr>
    </thead>
    <tbody>
      ${wikeloRows}
    </tbody>
  </table>
  ` : ''}

  ${execHangarRows ? `
    <div class="section-header">
      <h2>Executive Hangar Ships</h2>
    </div>

    <table>
    <thead>
      <tr>
        <th>Ship</th>
        <th>Power Plants</th>
        <th>Shields</th>
        <th>Coolers</th>
        <th>Quantum Drives</th>
        <th>Weapons</th>
      </tr>
    </thead>
    <tbody>
      ${execHangarRows}
    </tbody>
  </table>
  ` : ''}

  <div class="footer">
    Generated: ${new Date().toUTCString()} |
    <a href="https://github.com/scpages/default_loadout" target="_blank">GitHub Repository</a> |
    Data from <a href="https://www.erkul.games" target="_blank">erkul.games</a>
  </div>

  </div>

</body>
</html>
`;

fs.writeFileSync("index.html", html);

console.log("✅ index.html generated successfully");
