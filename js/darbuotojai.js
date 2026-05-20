// Darbuotojų portalo logika
// SVARBU: Nenaudojame anon_key kliento kode - visi duomenys per Edge Functions

const EDGE_FUNCTIONS_URL = 'https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1';

// Lithuanian months
const MONTHS_LT = [
    'Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis',
    'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'
];

// State
let currentUser = null;
let currentMonthSuvestine = new Date();
let currentMonthAtlyginimai = new Date();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Month navigation - Suvestinė
    document.getElementById('prev-month-suvestine').addEventListener('click', () => {
        currentMonthSuvestine.setMonth(currentMonthSuvestine.getMonth() - 1);
        loadSuvestine();
    });
    
    document.getElementById('next-month-suvestine').addEventListener('click', () => {
        currentMonthSuvestine.setMonth(currentMonthSuvestine.getMonth() + 1);
        loadSuvestine();
    });
    
    // Month navigation - Atlyginimai
    document.getElementById('prev-month-atlyginimai').addEventListener('click', () => {
        currentMonthAtlyginimai.setMonth(currentMonthAtlyginimai.getMonth() - 1);
        loadAtlyginimai();
    });
    
    document.getElementById('next-month-atlyginimai').addEventListener('click', () => {
        currentMonthAtlyginimai.setMonth(currentMonthAtlyginimai.getMonth() + 1);
        loadAtlyginimai();
    });

    // Clock in
    const clockInBtn = document.getElementById('clock-in-btn');
    if (clockInBtn) {
        clockInBtn.addEventListener('click', async () => {
            clockInBtn.disabled = true;
            const sessionToken = localStorage.getItem('darbuotojai_session');
            try {
                const res = await fetch(`${EDGE_FUNCTIONS_URL}/darbuotojai-clock`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
                    body: JSON.stringify({ action: 'clock_in', localDate: getLocalDate(), localDateTime: getLocalDateTime() })
                });
                const data = await res.json();
                if (res.ok) {
                    renderClockStatus(data.record);
                    showClockMessage('✅ Atvykimas pažymėtas!', 'success');
                } else {
                    showClockMessage(data.error || 'Klaida', 'error');
                    clockInBtn.disabled = false;
                }
            } catch (e) {
                showClockMessage('Serverio klaida', 'error');
                clockInBtn.disabled = false;
            }
        });
    }

    // Clock out
    const clockOutBtn = document.getElementById('clock-out-btn');
    if (clockOutBtn) {
        clockOutBtn.addEventListener('click', async () => {
            // If 18+ hours since clock-in, show modal for manual time entry
            if (clockRecord && clockRecord.pradzios_laikas) {
                const clockInTime = new Date(clockRecord.pradzios_laikas.replace(/([+-]\d{2}:\d{2}|Z)$/, ''));
                const hoursElapsed = (Date.now() - clockInTime.getTime()) / (1000 * 60 * 60);
                if (hoursElapsed >= 18) {
                    showClockOutModal();
                    return;
                }
            }
            // Normal clock out
            clockOutBtn.disabled = true;
            const sessionToken = localStorage.getItem('darbuotojai_session');
            try {
                const res = await fetch(`${EDGE_FUNCTIONS_URL}/darbuotojai-clock`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
                    body: JSON.stringify({ action: 'clock_out', localDate: getLocalDate(), localDateTime: getLocalDateTime() })
                });
                const data = await res.json();
                if (res.ok) {
                    renderClockStatus(data.record);
                    showClockMessage('🏁 Darbo diena baigta!', 'success');
                } else {
                    showClockMessage(data.error || 'Klaida', 'error');
                    clockOutBtn.disabled = false;
                }
            } catch (e) {
                showClockMessage('Serverio klaida', 'error');
                clockOutBtn.disabled = false;
            }
        });
    }

    // Manual entry toggle link (legacy, no-op)
    const manualToggleBtn = document.getElementById('clock-manual-toggle');
    if (manualToggleBtn) {
        manualToggleBtn.addEventListener('click', () => showClockOutModal());
    }


    // Manual clock-out confirm
    const manualConfirmBtn = document.getElementById('clock-manual-confirm');
    if (manualConfirmBtn) {
        manualConfirmBtn.addEventListener('click', () => {
            const dateInput = document.getElementById('clock-manual-date');
            const hourSel = document.getElementById('clock-manual-hour');
            const minSel = document.getElementById('clock-manual-minute');
            const dateVal = dateInput ? dateInput.value : '';
            const hh = hourSel ? hourSel.value : '';
            const mm = minSel ? minSel.value : '';
            if (!dateVal || !hh || !mm) { showClockMessage('Įveskite datą ir laiką', 'error'); return; }

            // Calculate hours elapsed (strip timezone to compare as local times)
            let hoursText = '';
            if (clockRecord && clockRecord.pradzios_laikas) {
                const startLocal = clockRecord.pradzios_laikas.replace(/([+-]\d{2}:\d{2}|Z)$/, '').substring(0, 16);
                const startMs = new Date(startLocal).getTime();
                const endMs = new Date(`${dateVal}T${hh}:${mm}`).getTime();
                const diffMin = Math.round((endMs - startMs) / 60000);
                if (diffMin > 0) {
                    const rawH = diffMin / 60;
                    const lunchMin = rawH >= 4 ? 60 : 0;
                    const netMin = diffMin - lunchMin;
                    const h = Math.floor(netMin / 60);
                    const m = netMin % 60;
                    hoursText = `\nAtvyko: ${formatTimeLocal(clockRecord.pradzios_laikas)}\nDirbtų valandų: ${h}h ${m}min`;
                }
            }

            const summary = document.getElementById('clock-modal-summary');
            if (summary) summary.textContent = `Išėjimo laikas: ${dateVal} ${hh}:${mm}${hoursText}`;

            document.getElementById('clock-modal-step1').style.display = 'none';
            document.getElementById('clock-modal-step2').style.display = 'block';
        });
    }

    const modalBackBtn = document.getElementById('clock-modal-back');
    if (modalBackBtn) {
        modalBackBtn.addEventListener('click', () => {
            document.getElementById('clock-modal-step2').style.display = 'none';
            document.getElementById('clock-modal-step1').style.display = 'block';
        });
    }

    const modalSubmitBtn = document.getElementById('clock-modal-submit');
    if (modalSubmitBtn) {
        modalSubmitBtn.addEventListener('click', async () => {
            const dateInput = document.getElementById('clock-manual-date');
            const hourSel = document.getElementById('clock-manual-hour');
            const minSel = document.getElementById('clock-manual-minute');
            const dateVal = dateInput ? dateInput.value : '';
            const hh = hourSel ? hourSel.value : '';
            const mm = minSel ? minSel.value : '';
            const localDate = dateVal;
            const localDateTime = `${localDate}T${hh}:${mm}:00`;
            modalSubmitBtn.disabled = true;
            const sessionToken = localStorage.getItem('darbuotojai_session');
            try {
                const res = await fetch(`${EDGE_FUNCTIONS_URL}/darbuotojai-clock`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
                    body: JSON.stringify({ action: 'clock_out', localDate, localDateTime })
                });
                const data = await res.json();
                if (res.ok) {
                    hideClockOutModal();
                    renderClockStatus(data.record);
                    showClockMessage('🏁 Darbo diena baigta!', 'success');
                } else {
                    showClockMessage(data.error || 'Klaida', 'error');
                    modalSubmitBtn.disabled = false;
                }
            } catch (e) {
                showClockMessage('Serverio klaida', 'error');
                modalSubmitBtn.disabled = false;
            }
        });
    }

    // Manual cancel
    const manualCancelBtn = document.getElementById('clock-manual-cancel');
    if (manualCancelBtn) {
        manualCancelBtn.addEventListener('click', () => hideClockOutModal());
    }
}

// Check if user has valid session
async function checkSession() {
    const sessionToken = localStorage.getItem('darbuotojai_session');
    
    if (!sessionToken) {
        showLoginScreen();
        return;
    }
    
    try {
        // Validate session with Edge Function
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/darbuotojai-validate-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.user) {
            currentUser = data.user;
            showDashboard();
            loadSuvestine();
        } else {
            localStorage.removeItem('darbuotojai_session');
            showLoginScreen();
        }
    } catch (error) {
        console.error('Session validation error:', error);
        localStorage.removeItem('darbuotojai_session');
        showLoginScreen();
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    errorDiv.classList.remove('show');
    
    if (password.length < 6) {
        showError('Slaptažodis turi būti bent 6 simbolių');
        return;
    }
    
    try {
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/darbuotojai-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(data.error || 'Prisijungimo klaida');
            return;
        }
        
        // Save session
        currentUser = data.user;
        localStorage.setItem('darbuotojai_session', data.sessionToken);
        
        // Show dashboard
        showDashboard();
        loadSuvestine();
        
    } catch (error) {
        console.error('Login error:', error);
        showError('Įvyko klaida. Bandykite vėliau.');
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('darbuotojai_session');
    currentUser = null;
    showLoginScreen();
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
}

// Show login screen
function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

// Show dashboard
function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    
    // Set employee name
    document.getElementById('employee-name').textContent = 
        `${currentUser.vardas} ${currentUser.pavarde}`;

    // Only show clock widget if user has darbuotojas_id
    const clockWidget = document.getElementById('clock-widget');
    if (currentUser.darbuotojasId) {
        clockWidget.style.display = 'block';
        startLiveClock();
        loadClockStatus();
    } else {
        clockWidget.style.display = 'none';
    }
}

// Switch tabs
function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    // Load data for the tab
    if (tabName === 'suvestine') {
        loadSuvestine();
    } else if (tabName === 'atlyginimai') {
        loadAtlyginimai();
    }
}

// Load Mėnesio Suvestinė
async function loadSuvestine() {
    const contentDiv = document.getElementById('suvestine-content');
    const monthTitle = document.getElementById('current-month-suvestine');
    
    // Update month title
    monthTitle.textContent = `${MONTHS_LT[currentMonthSuvestine.getMonth()]} ${currentMonthSuvestine.getFullYear()}`;
    
    // Show loading
    contentDiv.innerHTML = '<p class="loading-message">Kraunama...</p>';
    
    const sessionToken = localStorage.getItem('darbuotojai_session');
    const year = currentMonthSuvestine.getFullYear();
    const month = currentMonthSuvestine.getMonth() + 1;
    
    try {
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/darbuotojai-suvestine`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({ year, month })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            contentDiv.innerHTML = `<div class="empty-state">
                <p>${data.error || 'Įvyko klaida'}</p>
            </div>`;
            return;
        }
        
        if (!data.records || data.records.length === 0) {
            contentDiv.innerHTML = `<div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Nėra duomenų</h3>
                <p>Šiam mėnesiui nėra įrašų</p>
            </div>`;
            return;
        }
        
        // Render table
        renderSuvestineTable(data.records, data.totalHours);
        
    } catch (error) {
        console.error('Error loading suvestine:', error);
        contentDiv.innerHTML = `<div class="empty-state">
            <p>Įvyko klaida. Bandykite vėliau.</p>
        </div>`;
    }
}

// Render Suvestinė table
function renderSuvestineTable(records, totalHours) {
    const contentDiv = document.getElementById('suvestine-content');
    
    let html = `
        <table class="suvestine-table">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Pradžia</th>
                    <th>Pabaiga</th>
                    <th>Valandos</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    records.forEach(record => {
        const valandos = record.valandos != null ? record.valandos.toFixed(1) : '0.0';
        
        html += `
            <tr>
                <td class="date">${formatDate(record.data)}</td>
                <td>${formatTime(record.pradzios_laikas)}</td>
                <td>${formatTime(record.pabaigos_laikas)}</td>
                <td class="hours">${valandos} val.</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        <div class="suvestine-summary">
            <h3>Iš viso:</h3>
            <span class="total">${(totalHours || 0).toFixed(1)} val.</span>
        </div>
    `;
    
    contentDiv.innerHTML = html;
}

// Load Mėnesio Atlyginimai
async function loadAtlyginimai() {
    const contentDiv = document.getElementById('atlyginimai-content');
    const monthTitle = document.getElementById('current-month-atlyginimai');
    
    // Update month title
    monthTitle.textContent = `${MONTHS_LT[currentMonthAtlyginimai.getMonth()]} ${currentMonthAtlyginimai.getFullYear()}`;
    
    // Show loading
    contentDiv.innerHTML = '<p class="loading-message">Kraunama...</p>';
    
    const sessionToken = localStorage.getItem('darbuotojai_session');
    const year = currentMonthAtlyginimai.getFullYear();
    const month = currentMonthAtlyginimai.getMonth() + 1;
    
    try {
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/darbuotojai-atlyginimai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({ year, month })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            contentDiv.innerHTML = `<div class="empty-state">
                <p>${data.error || 'Įvyko klaida'}</p>
            </div>`;
            return;
        }
        
        if (!data.salary) {
            contentDiv.innerHTML = `<div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Nėra duomenų</h3>
                <p>Šiam mėnesiui nėra apskaičiuoto atlyginimo</p>
            </div>`;
            return;
        }
        
        // Render salary card
        renderSalaryCard(data.salary);
        
    } catch (error) {
        console.error('Error loading atlyginimai:', error);
        contentDiv.innerHTML = `<div class="empty-state">
            <p>Įvyko klaida. Bandykite vėliau.</p>
        </div>`;
    }
}

// Render salary card
function renderSalaryCard(salary) {
    const contentDiv = document.getElementById('atlyginimai-content');
    
    const html = `
        <div class="atlyginimai-card">
            <h3>${MONTHS_LT[currentMonthAtlyginimai.getMonth()]} ${currentMonthAtlyginimai.getFullYear()}</h3>
            <div class="salary-details">
                <div class="salary-row">
                    <span class="salary-label">Norminės darbo dienos:</span>
                    <span class="salary-value">${salary.norminesDarboDienos || 0}</span>
                </div>
                <div class="salary-row">
                    <span class="salary-label">Pradirbta dienų:</span>
                    <span class="salary-value">${salary.pradirbtaDienu || 0}</span>
                </div>
                <div class="salary-row">
                    <span class="salary-label">Norminės valandos:</span>
                    <span class="salary-value">${(salary.norminesValandos || 0).toFixed(1)} val.</span>
                </div>
                <div class="salary-row">
                    <span class="salary-label">Pradirbta valandų:</span>
                    <span class="salary-value">${(salary.pradirbtoValandu || 0).toFixed(1)} val.</span>
                </div>
                <div class="salary-row">
                    <span class="salary-label">Bruto ant popieriaus:</span>
                    <span class="salary-value">${(salary.brutoAntPopieriaus || 0).toFixed(2)} €</span>
                </div>
                <div class="salary-row">
                    <span class="salary-label">Pritaikytas NPD:</span>
                    <span class="salary-value">${(salary.pritaikytasNPD || 0).toFixed(2)} €</span>
                </div>
                <div class="salary-row">
                    <span class="salary-label">GPM (20%):</span>
                    <span class="salary-value">${(salary.gpm || 0).toFixed(2)} €</span>
                </div>
                <div class="salary-row">
                    <span class="salary-label">Sodra darbuotojo:</span>
                    <span class="salary-value">${(salary.sodraDarbuotojo || 0).toFixed(2)} €</span>
                </div>
                <div class="salary-row">
                    <span class="salary-label">Sodra darbdavio:</span>
                    <span class="salary-value">${(salary.sodraDarbdavio || 0).toFixed(2)} €</span>
                </div>
                <div class="salary-row highlight">
                    <span class="salary-label">Neto (į rankas):</span>
                    <span class="salary-value">${(salary.neto || 0).toFixed(2)} €</span>
                </div>
                ${salary.avansuSuma > 0 ? `
                <div class="salary-row">
                    <span class="salary-label">Avansų suma:</span>
                    <span class="salary-value negative">-${(salary.avansuSuma || 0).toFixed(2)} €</span>
                </div>
                ` : ''}
                ${salary.priedas > 0 ? `
                <div class="salary-row">
                    <span class="salary-label">Priedas:</span>
                    <span class="salary-value positive">+${(salary.priedas || 0).toFixed(2)} €</span>
                </div>
                ` : ''}
                <div class="salary-row total">
                    <span class="salary-label">VISO:</span>
                    <span class="salary-value">${(salary.likutis || 0).toFixed(2)} €</span>
                </div>
                <div class="salary-row info">
                    <span class="salary-label">Darbo vietos kaina:</span>
                    <span class="salary-value">${(salary.darboVietosKaina || 0).toFixed(2)} €</span>
                </div>
            </div>
        </div>
    `;
    
    contentDiv.innerHTML = html;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
}

// Format time
function formatTime(timeString) {
    if (!timeString) return '-';
    // Extract time text directly (times stored as local time in DB via Tabelis app)
    if (timeString.includes('T')) {
        return timeString.split('T')[1].substring(0, 5);
    }
    return timeString.substring(0, 5);
}

// For clock widget: times stored as local time in DB, strip timezone suffix
function formatTimeLocal(timeString) {
    if (!timeString) return '-';
    // Strip timezone offset (+00:00, +03:00, Z etc.) and extract HH:MM
    const withoutTz = timeString.replace(/([+-]\d{2}:\d{2}|Z)$/, '');
    if (withoutTz.includes('T')) {
        return withoutTz.split('T')[1].substring(0, 5);
    }
    return withoutTz.substring(0, 5);
}

// ───────────────────────────────────────────────
// CLOCK IN / OUT
// ───────────────────────────────────────────────

let clockLiveTimer = null;
let clockRecord = null;

function getLocalDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getLocalDateTime() {
    const d = new Date();
    // Round minutes to nearest 5
    const roundedMinutes = Math.round(d.getMinutes() / 5) * 5;
    d.setMinutes(roundedMinutes, 0, 0);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${day}T${hh}:${mm}:00`;
}

function startLiveClock() {
    const timeEl = document.getElementById('clock-live-time');
    const dateEl = document.getElementById('clock-live-date');
    const DAYS_LT = ['Sekmadienis','Pirmadienis','Antradienis','Trečiadienis','Ketvirtadienis','Penktadienis','Šeštadienis'];

    function tick() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        timeEl.textContent = `${hh}:${mm}`;
        dateEl.textContent = `${DAYS_LT[now.getDay()]}, ${now.getDate()} ${MONTHS_LT[now.getMonth()]} ${now.getFullYear()}`;
    }
    tick();
    if (clockLiveTimer) clearInterval(clockLiveTimer);
    clockLiveTimer = setInterval(tick, 10000);
}

async function loadClockStatus() {
    const sessionToken = localStorage.getItem('darbuotojai_session');
    try {
        const res = await fetch(`${EDGE_FUNCTIONS_URL}/darbuotojai-clock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
            body: JSON.stringify({ action: 'status', localDate: getLocalDate() })
        });
        const data = await res.json();
        if (res.ok) {
            renderClockStatus(data.record);
        } else {
            // Show default state on error so user can still try
            renderClockStatus(null);
            console.error('Clock status error:', data.error);
        }
    } catch (e) {
        renderClockStatus(null);
        console.error('Clock status error:', e);
    }
}

function renderClockStatus(record) {
    const statusText = document.getElementById('clock-status-text');
    const clockInBtn = document.getElementById('clock-in-btn');
    const clockOutBtn = document.getElementById('clock-out-btn');
    const msg = document.getElementById('clock-message');
    clockRecord = record;
    msg.style.display = 'none';

    if (!record) {
        // Not clocked in yet
        statusText.textContent = 'Neprisijungta';
        statusText.className = 'clock-status-value status-none';
        clockInBtn.disabled = false;
        clockOutBtn.disabled = true;
    } else if (record.pradzios_laikas && !record.pabaigos_laikas) {
        // Clocked in, not out
        statusText.innerHTML = `<span class="status-dot status-in"></span>Atvyko ${formatTimeLocal(record.pradzios_laikas)}`;
        statusText.className = 'clock-status-value status-in-text';
        clockInBtn.disabled = true;
        clockOutBtn.disabled = false;
    } else if (record.pradzios_laikas && record.pabaigos_laikas) {
        // Full day done
        statusText.innerHTML = `<span class="status-dot status-done"></span>Baigė ${formatTimeLocal(record.pabaigos_laikas)} (atvyko ${formatTimeLocal(record.pradzios_laikas)})`;
        statusText.className = 'clock-status-value status-done-text';
        clockInBtn.disabled = true;
        clockOutBtn.disabled = true;
    }
}

function showClockOutModal() {
    const overlay = document.getElementById('clock-modal-overlay');
    if (!overlay) return;
    const dateInput = document.getElementById('clock-manual-date');
    if (dateInput) dateInput.value = getLocalDate();
    const hourSel = document.getElementById('clock-manual-hour');
    const minSel = document.getElementById('clock-manual-minute');
    if (hourSel && hourSel.options.length === 0) {
        for (let h = 0; h < 24; h++) {
            const o = document.createElement('option');
            o.value = o.textContent = h.toString().padStart(2, '0');
            hourSel.appendChild(o);
        }
    }
    if (minSel && minSel.options.length === 0) {
        for (let m = 0; m < 60; m += 5) {
            const o = document.createElement('option');
            o.value = o.textContent = m.toString().padStart(2, '0');
            minSel.appendChild(o);
        }
    }
    const now = new Date();
    if (hourSel) hourSel.value = now.getHours().toString().padStart(2, '0');
    const roundedMin = Math.round(now.getMinutes() / 5) * 5 % 60;
    if (minSel) minSel.value = roundedMin.toString().padStart(2, '0');
    overlay.style.display = 'flex';
}

function hideClockOutModal() {
    const overlay = document.getElementById('clock-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    const step1 = document.getElementById('clock-modal-step1');
    const step2 = document.getElementById('clock-modal-step2');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    const submitBtn = document.getElementById('clock-modal-submit');
    if (submitBtn) submitBtn.disabled = false;
}

// Legacy stubs (no longer used)
function showManualEntryOption() { showClockOutModal(); }
function hideManualEntryOption() { hideClockOutModal(); }

function showClockMessage(text, type) {
    const msg = document.getElementById('clock-message');
    msg.textContent = text;
    msg.className = `clock-message clock-msg-${type}`;
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 4000);
}


