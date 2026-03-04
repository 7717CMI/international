const fs = require('fs');
const path = require('path');

// Years: 2021-2033
const years = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

// Geography: US only
const geographies = ["U.S."];

// Segment definitions with market share splits
// Flat segments
const flatSegmentTypes = {
  "By Banking Organization Type": {
    "Global Investment Banks": 0.30,
    "Universal Banks": 0.28,
    "Private / Wealth Management Banks": 0.22,
    "Central Banks & Development Finance Institutions": 0.12,
    "Others (Fintech, Operations Centers, etc.)": 0.08
  },
  "By Time Horizon": {
    "Permanent Relocations": 0.45,
    "Rotational Assignments (1–3 years)": 0.35,
    "Temporary Deployments (<12 months)": 0.20
  }
};

// Hierarchical segment: By Move Type
const hierarchicalSegmentTypes = {
  "By Move Type": {
    "Employee Mobility": {
      share: 0.55,
      children: {
        "Executive / Expat Moves": 0.30,
        "Project / Assignment Moves": 0.25,
        "Mass / Business Unit Moves": 0.20,
        "Graduate / Rotation Programs": 0.15,
        "Return / Exit Moves": 0.10
      }
    },
    "Asset Mobility": {
      share: 0.45,
      children: {
        "Office & Branch Relocations": 0.30,
        "IT Infrastructure Moves": 0.25,
        "Data Center Migrations": 0.20,
        "Archive & Records Relocation": 0.15,
        "Others (Fine Art / High-Value Asset Transport, etc.)": 0.10
      }
    }
  }
};

// US base value (USD Million) for 2021 - total market
// Banking relocation services market ~$800M in US in 2021, growing ~9% CAGR
const baseValue = 800;
const baseGrowthRate = 0.09;

// Segment-specific growth multipliers
const flatGrowthMultipliers = {
  "By Banking Organization Type": {
    "Global Investment Banks": 1.05,
    "Universal Banks": 0.95,
    "Private / Wealth Management Banks": 1.12,
    "Central Banks & Development Finance Institutions": 0.88,
    "Others (Fintech, Operations Centers, etc.)": 1.20
  },
  "By Time Horizon": {
    "Permanent Relocations": 0.92,
    "Rotational Assignments (1–3 years)": 1.08,
    "Temporary Deployments (<12 months)": 1.15
  }
};

const hierarchicalGrowthMultipliers = {
  "By Move Type": {
    "Employee Mobility": {
      "Executive / Expat Moves": 1.05,
      "Project / Assignment Moves": 1.10,
      "Mass / Business Unit Moves": 0.95,
      "Graduate / Rotation Programs": 1.15,
      "Return / Exit Moves": 0.90
    },
    "Asset Mobility": {
      "Office & Branch Relocations": 0.98,
      "IT Infrastructure Moves": 1.18,
      "Data Center Migrations": 1.22,
      "Archive & Records Relocation": 0.88,
      "Others (Fine Art / High-Value Asset Transport, etc.)": 1.08
    }
  }
};

// Volume multiplier: units per USD Million
const volumePerMillionUSD = 120;

// Seeded pseudo-random for reproducibility
let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function addNoise(value, noiseLevel = 0.03) {
  return value * (1 + (seededRandom() - 0.5) * 2 * noiseLevel);
}

function roundTo1(val) {
  return Math.round(val * 10) / 10;
}

function roundToInt(val) {
  return Math.round(val);
}

function generateTimeSeries(baseVal, growthRate, roundFn) {
  const series = {};
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const rawValue = baseVal * Math.pow(1 + growthRate, i);
    series[year] = roundFn(addNoise(rawValue));
  }
  return series;
}

function generateData(isVolume) {
  const data = {};
  const roundFn = isVolume ? roundToInt : roundTo1;
  const multiplier = isVolume ? volumePerMillionUSD : 1;

  for (const geo of geographies) {
    const geoBase = baseValue * multiplier;
    const geoGrowth = baseGrowthRate;

    data[geo] = {};

    // Generate flat segments
    for (const [segType, segments] of Object.entries(flatSegmentTypes)) {
      data[geo][segType] = {};
      for (const [segName, share] of Object.entries(segments)) {
        const segGrowth = geoGrowth * flatGrowthMultipliers[segType][segName];
        const segBase = geoBase * share;
        data[geo][segType][segName] = generateTimeSeries(segBase, segGrowth, roundFn);
      }
    }

    // Generate hierarchical segments (By Move Type)
    for (const [segType, parentSegments] of Object.entries(hierarchicalSegmentTypes)) {
      data[geo][segType] = {};
      for (const [parentName, parentConfig] of Object.entries(parentSegments)) {
        data[geo][segType][parentName] = {};
        const parentBase = geoBase * parentConfig.share;
        for (const [childName, childShare] of Object.entries(parentConfig.children)) {
          const childGrowth = geoGrowth * hierarchicalGrowthMultipliers[segType][parentName][childName];
          const childBase = parentBase * childShare;
          data[geo][segType][parentName][childName] = generateTimeSeries(childBase, childGrowth, roundFn);
        }
      }
    }
  }

  return data;
}

// Generate both datasets
seed = 42;
const valueData = generateData(false);
seed = 7777;
const volumeData = generateData(true);

// Write files
const outDir = path.join(__dirname, 'public', 'data');
fs.writeFileSync(path.join(outDir, 'value.json'), JSON.stringify(valueData, null, 2));
fs.writeFileSync(path.join(outDir, 'volume.json'), JSON.stringify(volumeData, null, 2));

console.log('Generated value.json and volume.json successfully');
console.log('Geographies:', Object.keys(valueData));
console.log('Segment types:', Object.keys(valueData['U.S.']));
console.log('Sample - U.S., By Banking Organization Type:', JSON.stringify(valueData['U.S.']['By Banking Organization Type'], null, 2));
console.log('Sample - U.S., By Move Type keys:', Object.keys(valueData['U.S.']['By Move Type']));
console.log('Sample - U.S., By Move Type, Employee Mobility keys:', Object.keys(valueData['U.S.']['By Move Type']['Employee Mobility']));
