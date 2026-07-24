const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  console.log('Bundling GAS backend...');
  
  // 1. Bundle TypeScript into a single JavaScript file
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/index.ts')],
    bundle: true,
    outfile: path.join(__dirname, 'src/Code.js'),
    target: 'es2019',
    format: 'iife',
    globalName: 'GASApp'
  });

  // 2. Append top-level global handler functions for Apps Script Engine
  const globalHandlers = `
// Google Apps Script Top-Level Entry Points
function doGet(e) {
  return GASApp.doGet(e);
}

function doPost(e) {
  return GASApp.doPost(e);
}

function setupAllSpreadsheetsAndSheets() {
  return GASApp.setupAllSpreadsheetsAndSheets();
}

function cronDailyMailQueue() {
  return GASApp.cronDailyMailQueue();
}

function cronRecalculateDashboardCache() {
  return GASApp.cronRecalculateDashboardCache();
}

function cronAuditChainScan() {
  return GASApp.cronAuditChainScan();
}
`;

  fs.appendFileSync(path.join(__dirname, 'src/Code.js'), globalHandlers);
  console.log('Successfully generated backend/src/Code.js!');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
