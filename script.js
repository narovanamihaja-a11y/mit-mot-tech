// --- JAVASCRIPT SYSTEM ENGINE (PART 1) ---
const ADMIN_SECRET_KEY = "MIH2027"; 
let REGISTERED_USERS = [{ username: "admin", password: "123" }, { username: "mihmot", password: "tech" }];

const GAME_LEVELS = [
    { level: 1, letters: ["R", "O", "M", "A"], targetWords: ["RAME", "MARE"], extraWords: ["ARME", "AMOR"] },
    { level: 2, letters: ["A", "C", "H", "E", "R"], targetWords: ["CHER", "ARCHE", "RACE"], extraWords: ["CHAR"] },
    { level: 3, letters: ["A", "L", "E", "V", "R"], targetWords: ["LAVER", "RAVEL"], extraWords: ["LAVE"] }
];

const DAILY_WORDS = {
    "Lundi": { letters: ["P", "A", "R", "I", "S"], targetWords: ["PARIS", "PRISA"], extraWords: ["PAIR"] },
    "Mardi": { letters: ["A", "M", "I", "E", "S"], targetWords: ["AMIES", "AIME"], extraWords: ["AMIS"] },
    "Mercredi": { letters: ["C", "H", "I", "E", "N"], targetWords: ["CHIEN", "NICHE"], extraWords: ["NID"] },
    "Jeudi": { letters: ["T", "A", "B", "L", "E"], targetWords: ["TABLE", "TALE"], extraWords: ["BLE"] },
    "Vendredi": { letters: ["F", "L", "E", "U", "R"], targetWords: ["FLEUR", "LEUR"], extraWords: ["RUE"] },
    "Samedi": { letters: ["S", "O", "L", "E", "I", "L"], targetWords: ["SOLEIL", "LOIS"], extraWords: ["SOL"] },
    "Dimanche": { letters: ["V", "O", "Y", "A", "G", "E"], targetWords: ["VOYAGE", "VAGUE"], extraWords: ["VOIE"] }
};

const CALENDAR_REWARDS = { "Lundi": 50, "Mardi": 60, "Mercredi": 70, "Jeudi": 80, "Vendredi": 100, "Samedi": 150, "Dimanche": 250 };

let currentMode = "aventure"; let currentLevelIndex = 0; let coins = 500; let isCibleActive = false;
let selectedNodes = []; let isDrawing = false; let currentMousePos = { x: 0, y: 0 };
let discoveredWords = []; let extraCount = 0; let completedDailyDates = []; let activeDefiDateStr = "";

function getDayNameFrench() { const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]; return days[new Date().getDay()]; }
function getFormattedDate(dateObj) { return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`; }

// AUTH LOGIN MANAGEMENT
function handleLogin() {
    const userIn = document.getElementById("login-user").value.trim();
    const passIn = document.getElementById("login-pass").value.trim();
    const errorTxt = document.getElementById("login-error");
    const validUser = REGISTERED_USERS.find(u => u.username === userIn && u.password === passIn);

    if (validUser) {
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("main-game-area").classList.remove("hidden");
        loadGameEngine();
        initTouchControls();
    } else { errorTxt.textContent = "Username na Mot de passe diso ! ❌"; }
}

function promptAdminAccess() {
    let code = prompt("Code Admin secret :");
    if (code === ADMIN_SECRET_KEY) { document.getElementById("admin-panel").classList.remove("hidden"); renderAdminUsersList(); }
    else if (code !== null) { alert("Code erroné !🔒"); }
}
function closeAdminPanel() { document.getElementById("admin-panel").classList.add("hidden"); }

function renderAdminUsersList() {
    const listCont = document.getElementById("admin-users-list"); listCont.innerHTML = "";
    REGISTERED_USERS.forEach((user, index) => {
        const item = document.createElement("div"); item.className = "admin-user-item";
        item.innerHTML = `<span>👤 <b>${user.username}</b> (Mdp: ${user.password})</span>
                          <div><button onclick="editUserFromAdmin(${index})" style="background:#007aff;color:white;border:none;padding:2px 6px;border-radius:3px;cursor:pointer;">Mdf</button>
                          <button onclick="deleteUserFromAdmin(${index})" style="background:#ff3b30;color:white;border:none;padding:2px 6px;border-radius:3px;cursor:pointer;">X</button></div>`;
        listCont.appendChild(item);
    });
}

function saveUserFromAdmin() {
    const uInput = document.getElementById("admin-username").value.trim();
    const pInput = document.getElementById("admin-password").value.trim();
    if (!uInput || !pInput) return alert("Champs vides !");
    const exIdx = REGISTERED_USERS.findIndex(u => u.username === uInput);
    if (exIdx > -1) { REGISTERED_USERS[exIdx].password = pInput; alert("Modifié !"); }
    else { REGISTERED_USERS.push({ username: uInput, password: pInput }); alert("Ajouté !"); }
    document.getElementById("admin-username").value = ""; document.getElementById("admin-password").value = ""; renderAdminUsersList();
}
function editUserFromAdmin(index) { document.getElementById("admin-username").value = REGISTERED_USERS[index].username; document.getElementById("admin-password").value = REGISTERED_USERS[index].password; }
function deleteUserFromAdmin(index) { if (confirm("Supprimer ?")) { REGISTERED_USERS.splice(index, 1); renderAdminUsersList(); } }

function getActiveData() {
    if (currentMode === "defi") {
        let targetDateStr = activeDefiDateStr || getFormattedDate(new Date());
        let tempDate = new Date(targetDateStr);
        let days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
        return DAILY_WORDS[days[tempDate.getDay()]];
    }
    return GAME_LEVELS[currentLevelIndex];
}
// --- JAVASCRIPT SYSTEM ENGINE (PART 2) ---
function loadGameEngine() {
    const data = getActiveData(); discoveredWords = []; isCibleActive = false;
    document.getElementById("level-badge").textContent = currentMode === "defi" ? `DÉFI : ${activeDefiDateStr || getFormattedDate(new Date())}` : `NIVEAU ${data.level}`;
    document.getElementById("coin-count").textContent = coins;
    setupCanvas(); createWordGrid(data); renderLetters(data);
}

function setupCanvas() { const canvas = document.getElementById("link-canvas"); if (canvas) { canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight; } }

function createWordGrid(data) {
    const container = document.getElementById("grid-container"); container.innerHTML = "";
    data.targetWords.forEach(word => {
        const row = document.createElement("div"); row.className = "word-row"; row.id = `row-${word}`;
        for (let i = 0; i < word.length; i++) {
            const tile = document.createElement("div"); tile.className = "slot-tile"; tile.dataset.letter = word[i];
            tile.onclick = () => handleTileClick(tile, word); row.appendChild(tile);
        }
        container.appendChild(row);
    });
}

function renderLetters(data) {
    const wheel = document.getElementById("wheel-letters"); const canvas = document.getElementById("link-canvas");
    if (!wheel || !canvas) return; wheel.innerHTML = ""; const radius = 80; const centerX = canvas.width / 2; const centerY = canvas.height / 2;
    data.letters.forEach((letter, index) => {
        const angle = (index * 2 * Math.PI) / data.letters.length - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle); const y = centerY + radius * Math.sin(angle);
        const node = document.createElement("div"); node.className = "letter-node"; node.textContent = letter;
        node.style.left = `${x}px`; node.style.top = `${y}px`; node.dataset.letter = letter; wheel.appendChild(node);
    });
}

function initTouchControls() {
    const canvas = document.getElementById("link-canvas"); if (!canvas) return;
    const onStart = (e) => { if (isCibleActive) return; isDrawing = true; handlePointerEvent(e, canvas); };
    const onMove = (e) => { if (!isDrawing) return; handlePointerEvent(e, canvas); drawLines(); };
    const onEnd = () => {
        if (!isDrawing) return; isDrawing = false; checkWord();
        document.querySelectorAll(".letter-node").forEach(n => n.classList.remove("selected")); selectedNodes = [];
        const ctx = canvas.getContext("2d"); ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener("mousedown", onStart); window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchstart", onStart, { passive: false }); window.addEventListener("touchmove", onMove, { passive: false }); window.addEventListener("touchend", onEnd);
}

function handlePointerEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches.clientX : e.clientX; const clientY = e.touches ? e.touches.clientY : e.clientY;
    currentMousePos.x = clientX - rect.left; currentMousePos.y = clientY - rect.top;
    document.querySelectorAll(".letter-node").forEach(node => {
        const nx = parseFloat(node.style.left); const ny = parseFloat(node.style.top);
        if (Math.hypot(currentMousePos.x - nx, currentMousePos.y - ny) < 25 && !selectedNodes.includes(node)) {
            selectedNodes.push(node); node.classList.add("selected");
        }
    });
}

function drawLines() {
    const canvas = document.getElementById("link-canvas"); const ctx = canvas.getContext("2d"); if (!canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height); if (selectedNodes.length === 0) return;
    ctx.beginPath(); ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--line-color').trim();
    ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.lineJoin = "round";
    selectedNodes.forEach((node, idx) => {
        const x = parseFloat(node.style.left); const y = parseFloat(node.style.top);
        if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    if (isDrawing) ctx.lineTo(currentMousePos.x, currentMousePos.y); ctx.stroke();
}

function checkWord() {
    const word = selectedNodes.map(n => n.dataset.letter).join(""); const data = getActiveData();
    if (data.targetWords.includes(word)) {
        if (discoveredWords.includes(word)) { showToast("Déjà trouvé ! 💡"); return; }
        showToast("EXCELLENT ! ✨"); discoveredWords.push(word);
        document.querySelectorAll(`#row-${word} .slot-tile`).forEach(t => { t.textContent = t.dataset.letter; t.classList.add("revealed"); });
        if (discoveredWords.length === data.targetWords.length) {
            setTimeout(() => {
                showToast("NIVEAU COMPLÉTÉ ! 🌟 +50 🪙"); updateCoins(50);
                if (currentMode === "aventure") { currentLevelIndex++; if (currentLevelIndex >= GAME_LEVELS.length) currentLevelIndex = 0; }
                else { let activeDateStr = activeDefiDateStr || getFormattedDate(new Date()); if (!completedDailyDates.includes(activeDateStr)) completedDailyDates.push(activeDateStr); }
                setTimeout(() => loadGameEngine(), 1200);
            }, 800);
        }
    } else if (data.extraWords && data.extraWords.includes(word)) {
        showToast("Mot Extra ! 🎁 +10 🪙"); extraCount++; document.getElementById("extra-count").textContent = extraCount; updateCoins(10);
    } else { if (word.length >= 2) showToast("Inconnu ❌"); }
}

function triggerHintSimple() {
    if (coins < 100) return showToast("Pièces insuffisantes ! 🪙");
    const hidden = Array.from(document.querySelectorAll(".slot-tile:not(.revealed)"));
    if (hidden.length > 0) {
        updateCoins(-100); const target = hidden[Math.floor(Math.random() * hidden.length)];
        target.textContent = target.dataset.letter; target.classList.add("revealed"); checkGridCompletionAuto(target.parentElement);
    }
}

function triggerHintCible() {
    if (coins < 180) return showToast("Pièces insuffisantes ! 🪙");
    const hidden = Array.from(document.querySelectorAll(".slot-tile:not(.revealed)"));
    if (hidden.length > 0) { isCibleActive = true; showToast("🎯 Touchez la case à révéler"); hidden.forEach(t => t.classList.add("targeting")); }
}

function handleTileClick(tile, word) {
    if (!isCibleActive || tile.classList.contains("revealed")) return;
    updateCoins(-180); isCibleActive = false; document.querySelectorAll(".slot-tile").forEach(t => t.classList.remove("targeting"));
    tile.textContent = tile.dataset.letter; tile.classList.add("revealed"); checkGridCompletionAuto(tile.parentElement);
}

function checkGridCompletionAuto(row) {
    const word = row.id.replace("row-", "");
    if (Array.from(row.querySelectorAll(".slot-tile")).every(t => t.classList.contains("revealed")) && !discoveredWords.includes(word)) {
        discoveredWords.push(word);
        if (discoveredWords.length === getActiveData().targetWords.length) {
            setTimeout(() => { showToast("NIVEAU COMPLÉTÉ ! 🌟 +50 🪙"); updateCoins(50); if(currentMode === "aventure") { currentLevelIndex++; if (currentLevelIndex >= GAME_LEVELS.length) currentLevelIndex = 0; } loadGameEngine(); }, 1000);
        }
    }
}

function openCalendar() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `<h3>Calendrier Défi (Lundi - Dimanche)</h3><div class="calendar-grid" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:5px; max-height:220px; overflow-y:auto;"></div>`;
    const grid = body.querySelector(".calendar-grid"); let today = new Date(); let todayStr = getFormattedDate(today);
    for (let i = -15; i <= 5; i++) {
        let targetDate = new Date(); targetDate.setDate(today.getDate() + i); let dateStr = getFormattedDate(targetDate);
        let daysFrench = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]; let dayLabel = `${daysFrench[targetDate.getDay()]} ${targetDate.getDate()}`;
        const div = document.createElement("div"); div.className = "calendar-day"; div.style.padding = "8px 2px"; div.style.fontSize = "0.75rem"; div.style.borderRadius = "5px"; div.style.textAlign = "center";
        if (dateStr > todayStr) { div.innerHTML = `<span>${dayLabel}</span><br><span style='font-size:0.6rem;'>🔒 Bloc</span>`; div.style.background = "#2c2c2e"; div.style.opacity = "0.4"; }
        else {
            let isDone = completedDailyDates.includes(dateStr); div.innerHTML = `<span>${dayLabel}</span><br><span style='font-size:0.6rem;'>${isDone ? '✅ Fait' : '🎮 Jouer'}</span>`;
            div.style.background = dateStr === todayStr ? "#3a3010" : "#2c2c2e"; div.style.cursor = "pointer";
            div.onclick = () => { currentMode = "defi"; activeDefiDateStr = dateStr; switchMode("defi"); closeModal(); };
        }
        grid.appendChild(div);
    }
    document.getElementById("game-modal").classList.remove("hidden");
}

function openWheelOfFortune() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `<h3>Roue de la Fortune</h3><div class='wheel-spin-area'><button class='tab-btn active' style='padding:15px; width:100%; margin:15px 0;' onclick='spinWheel()'>LANCER LE SPIN 🎰</button><p id='spin-res' style='font-weight:bold; color:#ffd700; min-height:24px;'></p></div>`;
    document.getElementById("game-modal").classList.remove("hidden");
}

function spinWheel() {
    const gains = [10, 20, 50, 100, 200]; 
    const finalGain = gains[Math.floor(Math.random() * gains.length)];
    document.getElementById("spin-res").textContent = `Félicitations ! Vous gagnez ${finalGain} 🪙`; updateCoins(finalGain);
}

function closeModal() { document.getElementById("game-modal").classList.add("hidden"); }
function updateCoins(amount) { coins += amount; document.getElementById("coin-count").textContent = coins; }
function changeTheme(theme) { document.body.setAttribute("data-theme", theme); }
function switchMode(mode) { currentMode = mode; if (mode === "defi") activeDefiDateStr = getFormattedDate(new Date()); document.getElementById("btn-mode-aventure").classList.toggle("active", mode === "aventure"); document.getElementById("btn-mode-defi").classList.toggle("active", mode === "defi"); loadGameEngine(); }
function showToast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.classList.remove("hidden"); setTimeout(() => t.classList.add("hidden"), 1800); }
document.getElementById("shuffle-btn").onclick = () => { const data = getActiveData(); data.letters.sort(() => Math.random() - 0.5); renderLetters(data); };
window.onload = () => { loadGameEngine(); initTouchControls(); };
window.onresize = setupCanvas;