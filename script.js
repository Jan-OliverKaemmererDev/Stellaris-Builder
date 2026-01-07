// Standard-Werte des Spiels
let gameState = {
    metal: 10,
    energy: 0,
    mineLevel: 0,
    powerPlantLevel: 0,
    lastUpdate: Date.now()
};

// 1. Initialisierung: Spielstand laden
function init() {
    const savedData = localStorage.getItem('stellaris_save');
    if (savedData) {
        gameState = JSON.parse(savedData);
    }
    updateUI();
    gameLoop();
}

// 2. Game Loop (Produktion alle 1 Sekunde)
function gameLoop() {
    setInterval(() => {
        // Logik: Mine braucht Energie zum Arbeiten
        let energyProduced = gameState.powerPlantLevel * 2;
        let metalProduced = Math.min(gameState.mineLevel * 1, energyProduced + 1); 

        gameState.metal += metalProduced;
        gameState.energy = energyProduced;

        updateUI();
        saveToLocalStorage();
    }, 1000);
}

// 3. Gebäude ausbauen
function upgradeBuilding(type) {
    if (type === 'mine') {
        let cost = Math.floor(10 * Math.pow(1.5, gameState.mineLevel));
        if (gameState.metal >= cost) {
            gameState.metal -= cost;
            gameState.mineLevel++;
        }
    } else if (type === 'powerPlant') {
        let cost = Math.floor(15 * Math.pow(1.5, gameState.powerPlantLevel));
        if (gameState.metal >= cost) {
            gameState.metal -= cost;
            gameState.powerPlantLevel++;
        }
    }
    updateUI();
}

// 4. Benutzeroberfläche aktualisieren
function updateUI() {
    document.getElementById('metal').innerText = Math.floor(gameState.metal);
    document.getElementById('energy').innerText = gameState.energy;
    document.getElementById('mine-level').innerText = gameState.mineLevel;
    document.getElementById('plant-level').innerText = gameState.powerPlantLevel;
    
    document.getElementById('mine-cost').innerText = Math.floor(10 * Math.pow(1.5, gameState.mineLevel));
    document.getElementById('plant-cost').innerText = Math.floor(15 * Math.pow(1.5, gameState.powerPlantLevel));
}

// --- SPEICHER-FUNKTIONEN ---

function saveToLocalStorage() {
    localStorage.setItem('stellaris_save', JSON.stringify(gameState));
}

function downloadSave() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameState));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "stellaris_save.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importSave(event) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedState = JSON.parse(e.target.result);
            gameState = importedState;
            updateUI();
            alert("Spielstand erfolgreich geladen!");
        } catch (err) {
            alert("Fehler: Ungültige Datei.");
        }
    };
    reader.readAsText(event.target.files[0]);
}

function resetGame() {
    if(confirm("Möchtest du wirklich neu anfangen?")) {
        localStorage.removeItem('stellaris_save');
        location.reload();
    }
}

// Start
init();