// Spielzustand
let gameState = {
    metal: 50,
    energy: 0,
    mineLevel: 0,
    powerPlantLevel: 0,
    playedSeconds: 0,
    propulsionLevel: 0,
    aiLevel: 0,
    fusionLevel: 0,
    transporterCount: 0,
    cargoCount: 0,
    colonyCount: 0,
    hasBioStation: false,
    lastTick: Date.now()
};

// Initialisierung
function init() {
    const savedData = localStorage.getItem('stellaris_save_v1');
    if (savedData) {
        let loadedState = JSON.parse(savedData);
        
        // KRITISCH: Falls der geladene Wert NaN ist, nutzen wir den Standard-Staat
        if (isNaN(loadedState.metal)) {
            console.error("Fehlerhafter Spielstand entdeckt, lade Standardwerte...");
        } else {
            gameState = loadedState;
        }
        
        calculateOfflineProgress();
    }
    updateUI();
    startProduction();
}

function calculateOfflineProgress() {
    const now = Date.now();
    
    // Sicherheitsabfrage: Falls lastTick fehlt oder ungültig ist, brich ab
    if (!gameState.lastTick || isNaN(gameState.lastTick)) {
        gameState.lastTick = now;
        return;
    }

    const deltaMs = now - gameState.lastTick;
    const deltaSeconds = Math.floor(deltaMs / 1000);

    if (deltaSeconds > 0) {
        let energyForProd = gameState.powerPlantLevel * (10 + (gameState.fusionLevel * 5));
        let metalPerSec = 1;
        if (energyForProd >= gameState.mineLevel * 2) {
            metalPerSec += gameState.mineLevel * 5;
        }

        const totalOfflineMetal = metalPerSec * deltaSeconds;
        
        // Nur addieren, wenn das Ergebnis eine gültige Zahl ist
        if (!isNaN(totalOfflineMetal)) {
            gameState.metal += totalOfflineMetal;
            alert(`Willkommen zurück! In deiner Abwesenheit (${deltaSeconds}s) wurden ${Math.floor(totalOfflineMetal)} Metall produziert.`);
        }
    }
    
    gameState.lastTick = now;
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v < 10 ? "0" + v : v).join(":");
}

function startProduction() {
    setInterval(() => {
        // 1. Energie berechnen: Basis (10) + Bonus durch Fusionsforschung (+5 pro Level)
        let energyPerPlant = 10 + (gameState.fusionLevel * 5);
        gameState.energy = gameState.powerPlantLevel * energyPerPlant;

        // 2. Basis-Produktion (Startwert)
        let productionPerSecond = 1;

        // 3. Minen-Produktion hinzufügen
        // Nur wenn Energie >= Mine-Level * 2
        if (gameState.energy >= gameState.mineLevel * 2) {
            productionPerSecond += (gameState.mineLevel * 5); 
        }

        // 4. Boni berechnen
        let cargoBonus = 1 + (gameState.cargoCount * 0.05); // +5% pro Logistikschiff
        let aiBonus = 1 + (gameState.aiLevel * 0.1);       // +10% pro KI-Level
        let bioBonus = gameState.hasBioStation ? 1.2 : 1;   // +20% durch Bio-Station

        // 5. Gesamte Produktion mit ALLEN Boni multiplizieren
        // Das ist der entscheidende Schritt für die Geschwindigkeit!
        let totalProduction = productionPerSecond * cargoBonus * aiBonus * bioBonus;

        // 6. Produktion zum Metall-Stand hinzufügen (Geteilt durch 10 für den 100ms Takt)
        gameState.metal += (totalProduction / 10);

        // 7. Spielzeit hochzählen
        if (Math.floor(Date.now() / 1000) !== Math.floor(gameState.lastTick / 1000)) {
            gameState.playedSeconds++;
        }
        
        gameState.lastTick = Date.now();
        updateUI();
        saveToLocal();
    }, 100); 
}

function upgradeBuilding(type) {
    let cost = 0;
    if (type === 'mine') {
        cost = Math.floor(10 * Math.pow(1.6, gameState.mineLevel));
        if (gameState.metal >= cost) {
            gameState.metal -= cost;
            gameState.mineLevel++;
            saveToLocal(); // WICHTIG: Sofort speichern!
        }
    } else if (type === 'powerPlant') {
        cost = Math.floor(15 * Math.pow(1.6, gameState.powerPlantLevel));
        if (gameState.metal >= cost) {
            gameState.metal -= cost;
            gameState.powerPlantLevel++;
            saveToLocal(); // WICHTIG: Sofort speichern!
        }
    }
    updateUI();
}

function upgradeResearch(type) {
    let cost = 0;
    
    // Kostenberechnung für die verschiedenen Forschungszweige
    if (type === 'propulsion') {
        cost = Math.floor(100 * Math.pow(1.8, gameState.propulsionLevel));
    } else if (type === 'ai') {
        cost = Math.floor(150 * Math.pow(1.8, gameState.aiLevel));
    } else if (type === 'fusion') {
        // Kosten für Fusionsreaktoren berechnen
        cost = Math.floor(200 * Math.pow(1.8, gameState.fusionLevel));
    }
    
    // Prüfen, ob genug Metall vorhanden ist
    if (gameState.metal >= cost) {
        gameState.metal -= cost;
        
        // Level des entsprechenden Typs erhöhen
        if (type === 'propulsion') gameState.propulsionLevel++;
        if (type === 'ai') gameState.aiLevel++;
        if (type === 'fusion') gameState.fusionLevel++; // Dies hat gefehlt!
        
        updateUI();
        saveToLocal();
    } else {
        alert("Nicht genug Metall für die Forschung!");
    }
}

function buildShip(type) {
    let cost = 0;
    if (type === 'transporter') cost = 50;
    if (type === 'colony') cost = 500;
    if (type === 'cargo') cost = 150; // Kosten für das Logistikschiff

    if (gameState.metal >= cost) {
        gameState.metal -= cost;
        if (type === 'transporter') gameState.transporterCount++;
        if (type === 'colony') gameState.colonyCount++;
        if (type === 'cargo') gameState.cargoCount++; // Erhöht die Anzahl
        
        updateUI();
        saveToLocal();
    } else {
        alert("Nicht genug Metall!");
    }
}

function buildStation() {
    const cost = 2000; // Kosten wie im HTML angezeigt
    
    // Prüfen, ob schon gebaut oder nicht genug Metall
    if (gameState.hasBioStation) {
        alert("Das Bio-Forschungslabor wurde bereits errichtet!");
        return;
    }

    if (gameState.metal >= cost) {
        gameState.metal -= cost;
        gameState.hasBioStation = true; // Aktiviert den 20% Bonus
        
        updateUI();
        saveToLocal();
        alert("Bio-Forschungslabor erfolgreich errichtet! Deine Produktion steigt um 20%.");
    } else {
        alert("Nicht genug Metall für das Forschungslabor!");
    }
}

function updateUI() {
    // Ressourcen
    document.getElementById('metal').innerText = Math.floor(gameState.metal).toLocaleString();
    document.getElementById('energy').innerText = gameState.energy;
    document.getElementById('play-time').innerText = formatTime(gameState.playedSeconds);

    // Energie-Anzeige
    const energyElement = document.getElementById('energy');
    energyElement.innerText = gameState.energy;

    // Kleiner visueller Hinweis: Energie wird rot, wenn die Minen zu viel verbrauchen
    if (gameState.energy < gameState.mineLevel * 2) {
        energyElement.style.color = "#ff4d4d";
    } else {
        energyElement.style.color = "var(--text-color)";
    }

    // Level-Anzeigen
    document.getElementById('mine-level').innerText = gameState.mineLevel;
    document.getElementById('plant-level').innerText = gameState.powerPlantLevel;

    // Minen
    document.getElementById('mine-level').innerText = gameState.mineLevel;
    document.getElementById('mine-cost').innerText = Math.floor(10 * Math.pow(1.6, gameState.mineLevel));
    document.getElementById('plant-level').innerText = gameState.powerPlantLevel;
    document.getElementById('plant-cost').innerText = Math.floor(15 * Math.pow(1.6, gameState.powerPlantLevel));

    // Forschung & Flotte (Sicherstellen, dass diese IDs in der index.html existieren!)
    if(document.getElementById('propulsion-level')) {
        document.getElementById('propulsion-level').innerText = gameState.propulsionLevel;
    }
    if(document.getElementById('propulsion-cost')) {
        let propulsionCost = Math.floor(100 * Math.pow(1.8, gameState.propulsionLevel));
        document.getElementById('propulsion-cost').innerText = propulsionCost.toLocaleString();
    }

    if(document.getElementById('fusion-level')) {
        document.getElementById('fusion-level').innerText = gameState.fusionLevel;
    }
    if(document.getElementById('fusion-cost')) {
        let fusionCost = Math.floor(200 * Math.pow(1.8, gameState.fusionLevel));
        document.getElementById('fusion-cost').innerText = fusionCost;
    }
    if(document.getElementById('ai-level')) {
        document.getElementById('ai-level').innerText = gameState.aiLevel;
    }
    if(document.getElementById('ai-cost')) {
        let aiCost = Math.floor(150 * Math.pow(1.8, gameState.aiLevel));
        document.getElementById('ai-cost').innerText = aiCost;
    }
    if(document.getElementById('cargo-count')) document.getElementById('cargo-count').innerText = gameState.cargoCount;
    if(document.getElementById('transporter-count')) document.getElementById('transporter-count').innerText = gameState.transporterCount;
    if(document.getElementById('colony-count')) document.getElementById('colony-count').innerText = gameState.colonyCount;
    
    // Status der Station
    const statusElement = document.getElementById('station-status');
    const stationBtn = document.getElementById('station-btn');

    if (gameState.hasBioStation) {
        statusElement.innerText = "Aktiv (Bio-Bonus +20%)";
        statusElement.style.color = "#4dff88"; // Schönes Grün für "Aktiv"
        if (stationBtn) {
            stationBtn.disabled = true;
            stationBtn.innerText = "ERRICHTET";
            stationBtn.style.opacity = "0.5";
        }
    } else {
        statusElement.innerText = "Inaktiv";
        statusElement.style.color = "var(--text-color)";
    }
}

// Speicher-Logik
function saveToLocal() {
    localStorage.setItem('stellaris_save_v1', JSON.stringify(gameState));
}

function downloadSave() {
    const blob = new Blob([JSON.stringify(gameState)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stellaris_backup.json`;
    a.click();
    toggleMenu(); 
}

function importSave(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedState = JSON.parse(e.target.result);
            // Sicherheitscheck: Nur übernehmen, wenn es ein Objekt ist
            if (typeof importedState === 'object') {
                gameState = importedState;
                updateUI();
                saveToLocal();
                alert("Daten erfolgreich geladen!");
                toggleMenu();
                location.reload(); // Seite neu laden, um alle Timer zu resetten
            }
        } catch (err) {
            alert("Ungültige Datei!");
        }
    };
    reader.readAsText(file);
}

function resetGame() {
    if(confirm("Alle Daten löschen? Dies setzt deinen Fortschritt komplett zurück.")) {
        localStorage.removeItem('stellaris_save_v1');
        location.reload(); // Erzwingt den Neustart mit dem Standard-gameState
    }
}

// Funktion zum Öffnen/Schließen des Menüs
function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    // Wir nutzen hier 'active' wie in deiner beispiel-style.css
    menu.classList.toggle('active');
}

// Schließe das Menü automatisch nach einem Klick (optional)
function closeMenu() {
    document.getElementById('sideMenu').classList.remove('open');
}

// Modifiziere die bestehenden Funktionen, damit das Menü schließt
const originalDownload = downloadSave;
downloadSave = function() {
    originalDownload();
    closeMenu();
};

const originalImport = importSave;
importSave = function(event) {
    originalImport(event);
    closeMenu();
};

init();