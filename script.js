// 1. GLOBALER SPIELZUSTAND
var gameState = {
  // Basis Ressourcen
  metal: 50,
  energy: 0,

  // Neue Ressourcen
  iron: 0,
  gold: 0,
  silver: 0,
  xenonite: 0,
  credits: 1000,
  personnel: 200,

  // Gebäude Level
  mineLevel: 0,
  powerPlantLevel: 0,

  // Forschung
  propulsionLevel: 0,
  aiLevel: 0,
  fusionLevel: 0,

  // Schiffe
  transporterCount: 0,
  cargoCount: 0,
  colonyCount: 0,
  miningShipCount: 0,

  // Infrastruktur
  hasBioStation: false,
  hasOrbitalShipyard: false,
  hasLargeStation: false,
  hasTradingPost: false,
  hasRefinery: false,

  // Mining Operationen
  miningOperations: [],
  nextMiningId: 1,

  // System
  playedSeconds: 0,
  lastTick: Date.now(),
};

// 2. INITIALISIERUNG & SPEICHERUNG
function init() {
  var savedData = localStorage.getItem("stellaris_save_v2");
  if (savedData) {
    applyLoadedData(JSON.parse(savedData));
  }
  updateUI();
  startProduction();
}

function applyLoadedData(loaded) {
  if (loaded && !isNaN(loaded.metal)) {
    // Merge new properties with old saves
    gameState = Object.assign({}, gameState, loaded);
    calculateOfflineProgress();
  }
}

function saveToLocal() {
  localStorage.setItem("stellaris_save_v2", JSON.stringify(gameState));
}

// 3. OFFLINE-FORTSCHRITT
function calculateOfflineProgress() {
  var now = Date.now();
  var diff = (now - gameState.lastTick) / 1000;
  if (diff > 10) {
    updateEnergyState();
    var prod = getProductionPerSecond();
    var offlineGains = prod * diff;
    gameState.metal += offlineGains;

    // Complete any mining operations that finished offline
    var completedOps = [];
    for (var i = 0; i < gameState.miningOperations.length; i++) {
      var op = gameState.miningOperations[i];
      if (now >= op.returnTime) {
        completedOps.push(op);
      }
    }

    var msg =
      "Willkommen zurück, Kommandant!\n\nIn deiner Abwesenheit von " +
      formatTime(Math.floor(diff)) +
      " wurden " +
      Math.floor(offlineGains).toLocaleString() +
      " Metall produziert.";

    if (completedOps.length > 0) {
      msg +=
        "\n\n" +
        completedOps.length +
        " Mining-Operationen wurden abgeschlossen!";
      for (var i = 0; i < completedOps.length; i++) {
        distributeMiningRewards();
      }
      gameState.miningOperations = gameState.miningOperations.filter(
        function (op) {
          return now < op.returnTime;
        },
      );
    }

    alert(msg);
  }
  gameState.lastTick = now;
}

// 4. PRODUKTIONS-LOGIK
function startProduction() {
  setInterval(function () {
    processTick();
  }, 100);
}

function processTick() {
  updateEnergyState();
  var productionAmount = getProductionPerSecond();
  gameState.metal += productionAmount / 10;
  updatePlayTime();
  updateMiningOperations();
  gameState.lastTick = Date.now();
  updateUI();
  saveToLocal();
}

function updateEnergyState() {
  var energyPerPlant = 10 + gameState.fusionLevel * 5;
  gameState.energy = gameState.powerPlantLevel * energyPerPlant;
}

function getProductionPerSecond() {
  var prod = 1;
  var requiredEnergy = gameState.mineLevel * 2;
  var energyReduction = 1 - gameState.aiLevel * 0.1;
  if (energyReduction < 0.1) energyReduction = 0.1;
  var effectiveRequiredEnergy = requiredEnergy * energyReduction;

  if (gameState.mineLevel > 0 && gameState.energy >= effectiveRequiredEnergy) {
    prod += gameState.mineLevel * 5;
  } else if (gameState.mineLevel > 0 && gameState.energy > 0) {
    prod +=
      (gameState.energy / effectiveRequiredEnergy) * (gameState.mineLevel * 5);
  }
  var cargoBonus = 1 + gameState.cargoCount * 0.05;
  var bioBonus = gameState.hasBioStation ? 1.2 : 1;
  return prod * cargoBonus * bioBonus;
}

function updatePlayTime() {
  var nowS = Math.floor(Date.now() / 1000);
  var lastS = Math.floor(gameState.lastTick / 1000);
  if (nowS !== lastS) {
    gameState.playedSeconds++;
  }
}

// 5. MINING-SYSTEM
function buildMiningShip() {
  var cost = calcCost(300, 1.5, gameState.miningShipCount);
  var personnelCost = 5;

  if (gameState.metal >= cost && gameState.personnel >= personnelCost) {
    gameState.metal -= cost;
    gameState.personnel -= personnelCost;
    gameState.miningShipCount++;
    saveToLocal();
    updateUI();
  } else {
    var msg =
      "Nicht genug Ressourcen!\nBenötigt: " +
      cost +
      " Metall, " +
      personnelCost +
      " Personal";
    alert(msg);
  }
}

function sendShipToMine() {
  var idleShips = gameState.miningShipCount - gameState.miningOperations.length;

  if (idleShips <= 0) {
    return alert("Alle Mining-Schiffe sind bereits unterwegs!");
  }

  var operation = {
    id: gameState.nextMiningId++,
    startTime: Date.now(),
    duration: 60000, // 60 Sekunden
    returnTime: Date.now() + 60000,
    status: "mining",
  };

  gameState.miningOperations.push(operation);
  saveToLocal();
  updateUI();
}

function updateMiningOperations() {
  var now = Date.now();
  var completed = [];

  for (var i = 0; i < gameState.miningOperations.length; i++) {
    var op = gameState.miningOperations[i];
    if (now >= op.returnTime && op.status === "mining") {
      completed.push(i);
    }
  }

  // Remove completed operations from end to start to maintain indices
  for (var i = completed.length - 1; i >= 0; i--) {
    completeMiningOperation(completed[i]);
  }
}

function completeMiningOperation(index) {
  distributeMiningRewards();
  gameState.miningOperations.splice(index, 1);
  saveToLocal();
  updateUI();
}

function distributeMiningRewards() {
  // Random rewards based on plan
  var ironGain = Math.floor(Math.random() * 21) + 20; // 20-40
  var silverGain = Math.floor(Math.random() * 11) + 10; // 10-20
  var goldGain = Math.floor(Math.random() * 6) + 5; // 5-10
  var xenoniteGain =
    Math.random() < 0.3 ? Math.floor(Math.random() * 3) + 1 : 0; // 1-3 or 0 (30% chance)

  gameState.iron += ironGain;
  gameState.silver += silverGain;
  gameState.gold += goldGain;
  gameState.xenonite += xenoniteGain;
}

// 6. HANDELSSYSTEM
function sellResource(type, amount) {
  var prices = {
    iron: 10,
    silver: 20,
    gold: 50,
    xenonite: 200,
  };

  if (!prices[type]) return;

  if (gameState[type] >= amount) {
    var earnings = amount * prices[type];
    gameState[type] -= amount;
    gameState.credits += earnings;
    saveToLocal();
    updateUI();
    alert(
      "Verkauft: " +
        amount +
        " " +
        type.toUpperCase() +
        " für " +
        earnings +
        " Credits!",
    );
  } else {
    alert("Nicht genug " + type.toUpperCase() + "!");
  }
}

function sellAll(type) {
  var amount = Math.floor(gameState[type]);
  if (amount > 0) {
    sellResource(type, amount);
  }
}

// 7. PERSONAL-SYSTEM
function hirePersonnel() {
  if (!gameState.hasLargeStation) {
    return alert("Benötigt: Große Raumstation!");
  }

  var amount = 10;
  var cost = amount * 100; // 100 Credits pro Person

  if (gameState.credits >= cost) {
    gameState.credits -= cost;
    gameState.personnel += amount;
    saveToLocal();
    updateUI();
  } else {
    alert("Nicht genug Credits! Benötigt: " + cost);
  }
}

// 8. GEBÄUDE MIT ABHÄNGIGKEITEN
function buildInfrastructure(type) {
  var buildings = {
    shipyard: {
      name: "Orbitale Schiffswerft",
      key: "hasOrbitalShipyard",
      costs: { metal: 2000, iron: 500, personnel: 10 },
    },
    station: {
      name: "Große Raumstation",
      key: "hasLargeStation",
      costs: { metal: 1500, iron: 300, personnel: 20 },
    },
    trading: {
      name: "Handelsposten",
      key: "hasTradingPost",
      costs: { metal: 800, credits: 500 },
    },
    refinery: {
      name: "Raffinerie",
      key: "hasRefinery",
      costs: { metal: 1200, iron: 400, personnel: 5 },
    },
  };

  var building = buildings[type];
  if (!building) return;

  if (gameState[building.key]) {
    return alert(building.name + " bereits gebaut!");
  }

  // Check costs
  var canBuild = true;
  var missingResources = [];

  for (var resource in building.costs) {
    if (gameState[resource] < building.costs[resource]) {
      canBuild = false;
      missingResources.push(
        building.costs[resource] + " " + resource.toUpperCase(),
      );
    }
  }

  if (!canBuild) {
    return alert(
      "Nicht genug Ressourcen!\nBenötigt: " + missingResources.join(", "),
    );
  }

  // Deduct costs
  for (var resource in building.costs) {
    gameState[resource] -= building.costs[resource];
  }

  gameState[building.key] = true;
  saveToLocal();
  updateUI();
  alert(building.name + " erfolgreich gebaut!");
}

// 9. UI AKTUALISIERUNG
function updateUI() {
  updateResourceDisplay();
  updateBuildingDisplay();
  updateResearchDisplay();
  updateShipAndStationDisplay();
  updateMiningDisplay();
  updateInfrastructureDisplay();
  updateTradingDisplay();
}

function updateResourceDisplay() {
  setVal("metal", Math.floor(gameState.metal).toLocaleString());
  setVal("energy", gameState.energy);
  setVal("iron", Math.floor(gameState.iron).toLocaleString());
  setVal("gold", Math.floor(gameState.gold).toLocaleString());
  setVal("silver", Math.floor(gameState.silver).toLocaleString());
  setVal("xenonite", Math.floor(gameState.xenonite).toLocaleString());
  setVal("credits", Math.floor(gameState.credits).toLocaleString());
  setVal("personnel", Math.floor(gameState.personnel).toLocaleString());

  var menuTime = document.getElementById("menu-play-time");
  if (menuTime) menuTime.innerText = formatTime(gameState.playedSeconds);
}

function updateBuildingDisplay() {
  setVal("mine-level", gameState.mineLevel);
  setVal("mine-cost", calcCost(10, 1.6, gameState.mineLevel));
  setVal("plant-level", gameState.powerPlantLevel);
  setVal("plant-cost", calcCost(15, 1.6, gameState.powerPlantLevel));
}

function updateResearchDisplay() {
  setVal("propulsion-level", gameState.propulsionLevel);
  setVal("propulsion-cost", calcCost(100, 1.8, gameState.propulsionLevel));
  setVal("ai-level", gameState.aiLevel);
  setVal("ai-cost", calcCost(150, 1.8, gameState.aiLevel));
  setVal("fusion-level", gameState.fusionLevel);
  setVal("fusion-cost", calcCost(200, 1.8, gameState.fusionLevel));
}

function updateShipAndStationDisplay() {
  // Check if shipyard exists for ship building
  var shipButtons = ["cargo-btn", "transporter-btn", "colony-btn"];
  for (var i = 0; i < shipButtons.length; i++) {
    var btn = document.getElementById(shipButtons[i]);
    if (btn) {
      if (!gameState.hasOrbitalShipyard) {
        btn.disabled = true;
        btn.title = "Benötigt: Orbitale Schiffswerft";
      } else {
        btn.disabled = false;
        btn.title = "";
      }
    }
  }

  setVal("cargo-count", gameState.cargoCount);
  setVal("cargo-cost", calcCost(2300, 1.5, gameState.cargoCount));
  setVal("transporter-count", gameState.transporterCount);
  setVal("transporter-cost", calcCost(500, 1.6, gameState.transporterCount));
  setVal("colony-count", gameState.colonyCount);
  setVal("colony-cost", calcCost(1000, 2.0, gameState.colonyCount));
  handleStationUI();
}

function handleStationUI() {
  var status = document.getElementById("station-status");
  var btn = document.getElementById("station-btn");
  if (gameState.hasBioStation) {
    if (status) status.innerText = "Aktiv (+20% Produktion)";
    if (btn) btn.style.display = "none";
  }
}

function updateMiningDisplay() {
  setVal("mining-ship-count", gameState.miningShipCount);
  setVal("mining-ship-cost", calcCost(300, 1.5, gameState.miningShipCount));

  var idleShips = gameState.miningShipCount - gameState.miningOperations.length;
  setVal("idle-mining-ships", idleShips);

  // Update mining operations list
  var container = document.getElementById("mining-operations");
  if (container) {
    container.innerHTML = "";

    if (gameState.miningOperations.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; opacity: 0.6;">Keine aktiven Mining-Operationen</p>';
    } else {
      for (var i = 0; i < gameState.miningOperations.length; i++) {
        var op = gameState.miningOperations[i];
        var now = Date.now();
        var remaining = Math.max(0, op.returnTime - now);
        var progress = Math.min(
          100,
          ((op.duration - remaining) / op.duration) * 100,
        );

        var opDiv = document.createElement("div");
        opDiv.className = "mining-operation-card";
        opDiv.innerHTML =
          "<h4>Mining-Schiff #" +
          op.id +
          "</h4>" +
          '<div class="progress-bar-container">' +
          '<div class="progress-bar-fill" style="width: ' +
          progress +
          '%"></div>' +
          "</div>" +
          '<p class="mining-timer">Verbleibende Zeit: ' +
          formatMiningTime(remaining) +
          "</p>";

        container.appendChild(opDiv);
      }
    }
  }
}

function updateInfrastructureDisplay() {
  updateInfrastructureCard(
    "shipyard",
    "Orbital Shipyard",
    gameState.hasOrbitalShipyard,
  );
  updateInfrastructureCard(
    "station",
    "Large Station",
    gameState.hasLargeStation,
  );
  updateInfrastructureCard("trading", "Trading Post", gameState.hasTradingPost);
  updateInfrastructureCard("refinery", "Refinery", gameState.hasRefinery);
}

function updateInfrastructureCard(type, name, isBuilt) {
  var status = document.getElementById(type + "-status");
  var btn = document.getElementById(type + "-btn");

  if (status && btn) {
    if (isBuilt) {
      status.innerText = "Aktiv";
      status.style.color = "#00ff00";
      btn.style.display = "none";
    } else {
      status.innerText = "Nicht gebaut";
      status.style.color = "#ff4d4d";
      btn.style.display = "block";
    }
  }
}

function updateTradingDisplay() {
  // Update sell buttons
  var resources = ["iron", "silver", "gold", "xenonite"];
  for (var i = 0; i < resources.length; i++) {
    var res = resources[i];
    setVal(res + "-amount", Math.floor(gameState[res]));
  }
}

// 10. UPGRADE-FUNKTIONEN (mit Abhängigkeiten)
function upgradeBuilding(type) {
  if (type === "mine") {
    // Benötigt Eisen ab Level 5
    if (gameState.mineLevel >= 5) {
      var ironCost = gameState.mineLevel * 10;
      if (gameState.iron < ironCost) {
        return alert("Nicht genug Eisen! Benötigt: " + ironCost);
      }
      gameState.iron -= ironCost;
    }
    performPurchase("mineLevel", 10, 1.6);
  }
  if (type === "powerPlant") performPurchase("powerPlantLevel", 15, 1.6);
  updateUI();
}

function upgradeResearch(type) {
  if (type === "propulsion") performPurchase("propulsionLevel", 100, 1.8);
  if (type === "ai") performPurchase("aiLevel", 150, 1.8);
  if (type === "fusion") {
    // Fusionsreaktoren benötigen Xenonit
    if (gameState.fusionLevel >= 2) {
      var xenoniteCost = gameState.fusionLevel * 2;
      if (gameState.xenonite < xenoniteCost) {
        return alert("Nicht genug Xenonit! Benötigt: " + xenoniteCost);
      }
      gameState.xenonite -= xenoniteCost;
    }
    performPurchase("fusionLevel", 200, 1.8);
  }
  updateUI();
}

function buildShip(type) {
  if (!gameState.hasOrbitalShipyard) {
    return alert("Benötigt: Orbitale Schiffswerft!");
  }

  var personnelCosts = {
    cargo: 15,
    transporter: 8,
    colony: 25,
  };

  var personnelCost = personnelCosts[type] || 0;

  if (gameState.personnel < personnelCost) {
    return alert("Nicht genug Personal! Benötigt: " + personnelCost);
  }

  gameState.personnel -= personnelCost;

  if (type === "cargo") performPurchase("cargoCount", 2300, 1.5);
  if (type === "transporter") performPurchase("transporterCount", 500, 1.6);
  if (type === "colony") performPurchase("colonyCount", 1000, 2.0);
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

// 11. HILFSFUNKTIONEN
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
  function pad(n) {
    return n < 10 ? "0" + n : n;
  }
  return pad(h) + ":" + pad(m) + ":" + pad(sec);
}

function formatMiningTime(ms) {
  var seconds = Math.ceil(ms / 1000);
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  function pad(n) {
    return n < 10 ? "0" + n : n;
  }
  return pad(m) + ":" + pad(s);
}

// 12. MENÜ & DATEI-SYSTEM
function toggleMenu() {
  document.getElementById("sideMenu").classList.toggle("active");
}

function downloadSave() {
  var data = JSON.stringify(gameState);
  var blob = new Blob([data], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "stellaris_save.json";
  a.click();
}

function importSave(event) {
  var file = event.target.files[0];
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var loaded = JSON.parse(e.target.result);
      if (loaded && typeof loaded === "object") {
        applyLoadedData(loaded);
        saveToLocal();
        location.reload();
      } else {
        alert("Ungültiges Dateiformat!");
      }
    } catch (err) {
      alert("Fehler beim Laden der Datei: " + err.message);
    }
  };
  reader.readAsText(file);
}

function resetGame() {
  if (confirm("Spielstand wirklich löschen?")) {
    localStorage.removeItem("stellaris_save_v2");
    location.reload();
  }
}

// START
init();
