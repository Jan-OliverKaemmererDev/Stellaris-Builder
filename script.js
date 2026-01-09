// 1. GLOBALER SPIELZUSTAND
var gameState = {
    metal: 50, energy: 0, mineLevel: 0, powerPlantLevel: 0,
    playedSeconds: 0, propulsionLevel: 0, aiLevel: 0,
    fusionLevel: 0, transporterCount: 0, cargoCount: 0,
    colonyCount: 0, hasBioStation: false, lastTick: Date.now()
};

// 2. INITIALISIERUNG & SPEICHERUNG
function init() {
    var savedData = localStorage.getItem('stellaris_save_v1');
    if (savedData) {
        applyLoadedData(JSON.parse(savedData));
    }
    updateUI();
    startProduction();
}

function applyLoadedData(loaded) {
    if (loaded && !isNaN(loaded.metal)) {
        gameState = loaded;
        calculateOfflineProgress();
    }
}

function saveToLocal() {
    localStorage.setItem('stellaris_save_v1', JSON.stringify(gameState));
}

// 3. OFFLINE-FORTSCHRITT
function calculateOfflineProgress() {
    var now = Date.now();
    var diff = (now - gameState.lastTick) / 1000;
    if (diff > 60) {
        gameState.metal += (getProductionPerSecond() * diff);
    }
    gameState.lastTick = now;
}

// 4. PRODUKTIONS-LOGIK
function startProduction() {
    setInterval(function() {
        processTick();
    }, 100);
}

function processTick() {
    updateEnergyState();
    var productionAmount = getProductionPerSecond();
    gameState.metal += (productionAmount / 10);
    updatePlayTime();
    gameState.lastTick = Date.now();
    updateUI();
    saveToLocal();
}

function updateEnergyState() {
    var energyPerPlant = 10 + (gameState.fusionLevel * 5);
    gameState.energy = gameState.powerPlantLevel * energyPerPlant;
}

function getProductionPerSecond() {
    var prod = 1;
    var requiredEnergy = gameState.mineLevel * 2;
    if (gameState.mineLevel > 0 && gameState.energy >= requiredEnergy) {
        prod += (gameState.mineLevel * 5);
    } else if (gameState.mineLevel > 0 && gameState.energy > 0) {
        prod += (gameState.energy / 2) * 5; 
    }
    var cargoBonus = 1 + (gameState.cargoCount * 0.05);
    var aiBonus = 1 + (gameState.aiLevel * 0.1);
    var bioBonus = gameState.hasBioStation ? 1.2 : 1;
    return prod * cargoBonus * aiBonus * bioBonus;
}

function updatePlayTime() {
    var nowS = Math.floor(Date.now() / 1000);
    var lastS = Math.floor(gameState.lastTick / 1000);
    if (nowS !== lastS) {
        gameState.playedSeconds++;
    }
}

// 5. UI AKTUALISIERUNG
function updateUI() {
    updateResourceDisplay();
    updateBuildingDisplay();
    updateResearchDisplay();
    updateShipAndStationDisplay();
}

function updateResourceDisplay() {
    setVal('metal', Math.floor(gameState.metal).toLocaleString());
    setVal('energy', gameState.energy);
    var menuTime = document.getElementById('menu-play-time');
    if (menuTime) menuTime.innerText = formatTime(gameState.playedSeconds);
}

function updateBuildingDisplay() {
    setVal('mine-level', gameState.mineLevel);
    setVal('mine-cost', calcCost(10, 1.6, gameState.mineLevel));
    setVal('plant-level', gameState.powerPlantLevel);
    setVal('plant-cost', calcCost(15, 1.6, gameState.powerPlantLevel));
}

function updateResearchDisplay() {
    setVal('propulsion-level', gameState.propulsionLevel);
    setVal('propulsion-cost', calcCost(100, 1.8, gameState.propulsionLevel));
    setVal('ai-level', gameState.aiLevel);
    setVal('ai-cost', calcCost(150, 1.8, gameState.aiLevel));
    setVal('fusion-level', gameState.fusionLevel);
    setVal('fusion-cost', calcCost(200, 1.8, gameState.fusionLevel));
}

function updateShipAndStationDisplay() {
    setVal('cargo-count', gameState.cargoCount);
    setVal('cargo-cost', calcCost(150, 1.5, gameState.cargoCount));
    setVal('transporter-count', gameState.transporterCount);
    setVal('transporter-cost', calcCost(500, 1.6, gameState.transporterCount));
    setVal('colony-count', gameState.colonyCount);
    setVal('colony-cost', calcCost(1000, 2.0, gameState.colonyCount));
    handleStationUI();
}

function handleStationUI() {
    var status = document.getElementById('station-status');
    var btn = document.getElementById('station-btn');
    if (gameState.hasBioStation) {
        if (status) status.innerText = "Aktiv (+20% Produktion)";
        if (btn) btn.style.display = "none";
    }
}

// 6. UPGRADE-FUNKTIONEN
function upgradeBuilding(type) {
    if (type === 'mine') performPurchase('mineLevel', 10, 1.6);
    if (type === 'powerPlant') performPurchase('powerPlantLevel', 15, 1.6);
    updateUI();
}

function upgradeResearch(type) {
    if (type === 'propulsion') performPurchase('propulsionLevel', 100, 1.8);
    if (type === 'ai') performPurchase('aiLevel', 150, 1.8);
    if (type === 'fusion') performPurchase('fusionLevel', 200, 1.8);
    updateUI();
}

function buildShip(type) {
    if (type === 'cargo') performPurchase('cargoCount', 150, 1.5);
    if (type === 'transporter') performPurchase('transporterCount', 500, 1.6);
    if (type === 'colony') performPurchase('colonyCount', 1000, 2.0);
    updateUI();
}

function buildStation() {
    if (gameState.hasBioStation) return alert("Bereits gebaut!");
    if (gameState.metal >= 2000) {
        gameState.metal -= 2000;
        gameState.hasBioStation = true;
        saveToLocal();
        updateUI();
    } else {
        alert("Nicht genug Metall!");
    }
}

function performPurchase(key, base, factor) {
    var cost = calcCost(base, factor, gameState[key]);
    if (gameState.metal >= cost) {
        gameState.metal -= cost;
        gameState[key]++;
        saveToLocal();
    } else {
        alert("Nicht genug Metall!");
    }
}

// 7. HILFSFUNKTIONEN
function calcCost(base, factor, level) {
    return Math.floor(base * Math.pow(factor, level));
}

function setVal(id, value) {
    var el = document.getElementById(id);
    if (el) el.innerText = value;
}

function formatTime(s) {
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    function pad(n) { return n < 10 ? '0' + n : n; }
    return pad(h) + ":" + pad(m) + ":" + pad(sec);
}

// 8. MENÜ & DATEI-SYSTEM
function toggleMenu() {
    document.getElementById('sideMenu').classList.toggle('active');
}

function downloadSave() {
    var data = JSON.stringify(gameState);
    var blob = new Blob([data], {type: 'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'stellaris_save.json';
    a.click();
}

function importSave(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        applyLoadedData(JSON.parse(e.target.result));
        saveToLocal();
        location.reload();
    };
    reader.readAsText(file);
}

function resetGame() {
    if (confirm("Spielstand wirklich löschen?")) {
        localStorage.removeItem('stellaris_save_v1');
        location.reload();
    }
}

// START
init();