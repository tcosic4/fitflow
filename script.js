const app = document.getElementById('app');

// State
let state = {
    mode: null,
    running: {
        startTime: null,
        interval: null,
        elapsed: 0,
        laps: 0
    },
    strength: {
        totalSets: 3,
        restTime: 30,
        currentSet: 0,
        timeLeft: 0,
        interval: null,
        isActive: false
    }
};

// Audio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep(freq = 800, duration = 0.1, type = 'sine', volume = 1.0) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();

    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);

    osc.stop(audioCtx.currentTime + duration);
}

function playStartSound() {
    playBeep(600, 0.1, 'square');
    setTimeout(() => playBeep(1200, 0.3, 'square'), 100);
}

function playLapSound() {
    // Rising "Success" Melody: A5 -> C#6 -> A6
    // Plays a quick, motivating sequence to mark the lap.
    playBeep(880, 0.08, 'square', 1.0);
    setTimeout(() => playBeep(1109, 0.08, 'square', 1.0), 100);
    setTimeout(() => playBeep(1760, 0.25, 'square', 1.0), 200);
}

function playRestFinishSound() {
    playBeep(880, 0.1, 'square');
    setTimeout(() => playBeep(880, 0.1, 'square'), 150);
    setTimeout(() => playBeep(1760, 0.4, 'square'), 300);
}

// FORMATTERS
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// WAKE LOCK
let wakeLock = null;
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
            });
            console.log('Wake Lock active');
        }
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
}
async function releaseWakeLock() {
    if (wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
    }
}


// VIEWS

function renderLanding() {
    releaseWakeLock(); // Release lock when back to menu

    app.innerHTML = `
        <div class="screen">
            <div class="screen-header">
                <h1>FitFlow</h1>
                <p class="subtitle">Choose your workout mode</p>
            </div>
            <div class="menu-grid">
                <div class="menu-card card-running" onclick="startRunningMode()">
                    <div class="icon">🏃‍♂️</div>
                    <h3>Running</h3>
                </div>
                <div class="menu-card card-strength" onclick="startStrengthSetup()">
                    <div class="icon">💪</div>
                    <h3>Strength</h3>
                </div>
            </div>
        </div>
    `;
}

// --- RUNNING MODE ---

function startRunningMode() {
    state.mode = 'running';
    state.running.elapsed = 0;
    state.running.laps = 0;
    requestWakeLock();
    renderRunning();
}

function renderRunning() {
    app.innerHTML = `
        <div class="screen">
            <div class="screen-header">
                <button class="btn btn-back" onclick="stopRunning()">← Back</button>
                <h2 style="margin-top:1rem; color:var(--running-color)">Running Mode</h2>
            </div>
            
            <div class="timer-display" id="run-timer">00:00</div>

            <div class="stats-row">
                <div class="stat-item">
                    <span class="stat-value" id="lap-count">0</span>
                    <span class="stat-label">Laps</span>
                </div>
            </div>

            <button id="btn-run-start" class="btn btn-start" onclick="toggleRunTimer()">START</button>
            <div id="run-controls" class="hidden" style="flex:1; display:flex; flex-direction:column; justify-content:center;">
                 <button class="lap-button" onclick="recordLap()">
                    <span>Tap</span>
                    Lap
                 </button>
            </div>
        </div>
    `;
}

function toggleRunTimer() {
    const btn = document.getElementById('btn-run-start');
    const controls = document.getElementById('run-controls');

    // Start Logic
    playStartSound();
    state.running.startTime = Date.now() - state.running.elapsed;
    state.running.interval = setInterval(updateRunTimer, 100);

    btn.classList.add('hidden');
    controls.classList.remove('hidden');
    controls.style.display = 'flex';
}

function updateRunTimer() {
    const now = Date.now();
    state.running.elapsed = now - state.running.startTime;
    document.getElementById('run-timer').innerText = formatTime(state.running.elapsed);
}

function recordLap() {
    playLapSound();
    state.running.laps++;
    document.getElementById('lap-count').innerText = state.running.laps;

    // Visual feedback
    const btn = document.querySelector('.lap-button');
    btn.style.transform = "scale(0.9)";
    setTimeout(() => btn.style.transform = "scale(1)", 100);
}

function stopRunning() {
    clearInterval(state.running.interval);
    state.mode = null;
    renderLanding();
}

// --- STRENGTH MODE ---

function startStrengthSetup() {
    state.mode = 'strength_setup';
    renderStrengthSetup();
}

function renderStrengthSetup() {
    app.innerHTML = `
        <div class="screen">
             <div class="screen-header">
                <button class="btn btn-back" onclick="renderLanding()">← Back</button>
                <h2 style="margin-top:1rem; color:var(--strength-color)">Strength Settings</h2>
            </div>

            <div class="input-group">
                <label>Number of Sets</label>
                <input type="number" id="inp-sets" class="input-field" value="${state.strength.totalSets}" min="1">
            </div>

            <div class="input-group">
                <label>Rest Time (seconds)</label>
                <input type="number" id="inp-rest" class="input-field" value="${state.strength.restTime}" min="5">
            </div>

            <button class="btn btn-start" style="background:var(--strength-color); color:white;" onclick="initStrengthWorkout()">START WORKOUT</button>
        </div>
    `;
}

function initStrengthWorkout() {
    const sets = parseInt(document.getElementById('inp-sets').value) || 3;
    const rest = parseInt(document.getElementById('inp-rest').value) || 30;

    state.strength.totalSets = sets;
    state.strength.restTime = rest;
    state.strength.currentSet = 0;
    state.strength.isActive = true;

    playStartSound();
    requestWakeLock();
    renderStrengthActive();
    startRestTimer();
}

function renderStrengthActive() {
    // Determine what to show. The user asked for "Count down rest time". 
    // And "Display how many sets completed".

    app.innerHTML = `
        <div class="screen">
             <div class="screen-header">
                <button class="btn btn-back" onclick="stopStrength()">Quit</button>
                <h2 style="margin-top:1rem; color:var(--strength-color)">Resting...</h2>
            </div>

            <div class="workout-active-view">
                <div class="countdown-circle">
                    <span id="rest-countdown" style="font-size: 2.5rem;">${formatDuration(state.strength.timeLeft || state.strength.restTime)}</span>
                </div>

                <div class="stats-row" style="width:100%">
                    <div class="stat-item">
                        <span class="stat-value" id="sets-completed">${state.strength.currentSet}</span>
                        <span class="stat-label">Sets Completed</span>
                    </div>
                     <div class="stat-item">
                        <span class="stat-value" style="color:var(--text-muted)">/ ${state.strength.totalSets}</span>
                        <span class="stat-label">Total</span>
                    </div>
                </div>
            </div>
            
            <p style="text-align:center; color:var(--text-muted); padding-bottom:1rem;">Next set starts automatically when timer hits zero.</p>
        </div>
    `;
}

function startRestTimer() {
    const endTime = Date.now() + (state.strength.restTime * 1000);

    // Initial display update
    updateStrengthDisplay(state.strength.restTime);

    clearInterval(state.strength.interval);
    state.strength.interval = setInterval(() => {
        const now = Date.now();
        const diff = endTime - now;
        const secondsLeft = Math.ceil(diff / 1000);

        if (secondsLeft >= 0) {
            updateStrengthDisplay(secondsLeft);
        }

        if (secondsLeft <= 0) {
            handleRestComplete();
        }
    }, 100); // Check more frequently 
}

function updateStrengthDisplay(seconds) {
    const el = document.getElementById('rest-countdown');
    if (el) el.innerText = formatDuration(seconds);
}

function handleRestComplete() {
    clearInterval(state.strength.interval); // Ensure timer stops before sound/alert
    playRestFinishSound();
    state.strength.currentSet++;

    const setsEl = document.getElementById('sets-completed');
    if (setsEl) setsEl.innerText = state.strength.currentSet;

    if (state.strength.currentSet >= state.strength.totalSets) {
        // Workout Complete
        setTimeout(() => {
            alert("Workout Complete!");
            renderLanding();
        }, 500);
    } else {
        // Auto restart as requested
        startRestTimer();
    }
}

function stopStrength() {
    clearInterval(state.strength.interval);
    state.mode = null;
    renderLanding();
}

// Initial Render
renderLanding();
