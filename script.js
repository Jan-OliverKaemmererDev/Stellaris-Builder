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
    hasBioStation: false
};

// Initialisierung
function init() {
    const savedData = localStorage.getItem('stellaris_save_v1');
    if (savedData) {
        gameState = JSON.parse(savedData);
        // BERECHNUNG DER OFFLINE-ZEIT
        calculateOfflineProgress();
    }
    updateUI();
    startProduction();
}

function calculateOfflineProgress() {
    const now = Date.now();
    const deltaMs = now - gameState.lastTick; // Vergangene Zeit in Millisekunden
    const deltaSeconds = Math.floor(deltaMs / 1000);

    if (deltaSeconds > 0) {
        // Berechne Produktion pro Sekunde (Logik wie im Loop)
        let energyForProd = gameState.powerPlantLevel * 10;
        let metalPerSec = 1;
        if (energyForProd >= gameState.mineLevel * 2) {
            metalPerSec += gameState.mineLevel * 5;
        }

        const totalOfflineMetal = metalPerSec * deltaSeconds;
        gameState.metal += totalOfflineMetal;

        // Optional: Nachricht an den User
        alert(`Willkommen zurück! In deiner Abwesenheit (${deltaSeconds}s) wurden ${totalOfflineMetal} Metall produziert.`);
    }
    
    // Zeitstempel nach Berechnung aktualisieren
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
        // Standard-Produktionslogik
        gameState.energy = gameState.powerPlantLevel * 10;
        let production = 1;
        if (gameState.energy >= gameState.mineLevel * 2) {
            production += gameState.mineLevel * 5;
        }
        
        gameState.metal += production;
        gameState.playedSeconds++;
        
        // WICHTIG: Zeitstempel bei jedem Tick/Speichern aktualisieren
        gameState.lastTick = Date.now();

        updateUI();
        saveToLocal();
    }, 1000);
}

function upgradeBuilding(type) {
    let cost = 0;
    if (type === 'mine') {
        cost = Math.floor(10 * Math.pow(1.6, gameState.mineLevel));
        if (gameState.metal >= cost) {
            gameState.metal -= cost;
            gameState.mineLevel++;
        }
    } else if (type === 'powerPlant') {
        cost = Math.floor(15 * Math.pow(1.6, gameState.powerPlantLevel));
        if (gameState.metal >= cost) {
            gameState.metal -= cost;
            gameState.powerPlantLevel++;
        }
    }
    updateUI();
}

function upgradeResearch(type) {
    let cost = 0;
    if (type === 'propulsion') cost = Math.floor(100 * Math.pow(1.8, gameState.propulsionLevel));
    if (type === 'ai') cost = Math.floor(150 * Math.pow(1.8, gameState.aiLevel));
    
    if (gameState.metal >= cost) {
        gameState.metal -= cost;
        if (type === 'propulsion') gameState.propulsionLevel++;
        if (type === 'ai') gameState.aiLevel++;
        updateUI();
        saveToLocal();
    } else {
        alert("Nicht genug Metall für die Forschung!");
    }
}

function buildStation() {
    if (gameState.metal >= 2000 && !gameState.hasBioStation) {
        gameState.metal -= 2000;
        gameState.hasBioStation = true;
        updateUI();
        saveToLocal();
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

function updateUI() {
    document.getElementById('metal').innerText = Math.floor(gameState.metal);
    document.getElementById('energy').innerText = gameState.energy;
    document.getElementById('mine-level').innerText = gameState.mineLevel;
    document.getElementById('plant-level').innerText = gameState.powerPlantLevel;
    document.getElementById('play-time').innerText = formatTime(gameState.playedSeconds);
    document.getElementById('mine-cost').innerText = Math.floor(10 * Math.pow(1.6, gameState.mineLevel));
    document.getElementById('plant-cost').innerText = Math.floor(15 * Math.pow(1.6, gameState.powerPlantLevel));
    document.getElementById('propulsion-level').innerText = gameState.propulsionLevel;
    document.getElementById('transporter-count').innerText = gameState.transporterCount;
    document.getElementById('cargo-count').innerText = gameState.cargoCount;
    document.getElementById('station-status').innerText = gameState.hasBioStation ? "Aktiv (Bio-Bonus +20%)" : "Inaktiv";
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
    toggleMenu(); // Menü schließen
}

function importSave(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            gameState = JSON.parse(e.target.result);
            updateUI();
            saveToLocal();
            alert("Daten erfolgreich geladen!");
            toggleMenu(); // Menü schließen
        } catch (err) {
            alert("Ungültige Datei!");
        }
    };
    reader.readAsText(file);
}

function resetGame() {
    if(confirm("Alle Daten löschen?")) {
        localStorage.removeItem('stellaris_save_v1');
        location.reload();
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