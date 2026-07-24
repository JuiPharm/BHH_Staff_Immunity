npx esbuild src/index.ts --bundle --outfile=src/Code.js --format=iife --global-name=GASApp --target=es2019

$wrapper = @"

// Google Apps Script Top-Level Entry Points
function doGet(e) { return GASApp.doGet(e); }
function doPost(e) { return GASApp.doPost(e); }
function setupAllSpreadsheetsAndSheets() { return GASApp.setupAllSpreadsheetsAndSheets(); }
function cronDailyMailQueue() { return GASApp.cronDailyMailQueue(); }
function cronRecalculateDashboardCache() { return GASApp.cronRecalculateDashboardCache(); }
function cronAuditChainScan() { return GASApp.cronAuditChainScan(); }
"@

Add-Content -Path src/Code.js -Value $wrapper

npx @google/clasp push
