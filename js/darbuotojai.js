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
    
    const email = document.getElementById('email').value.trim();
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
    
    // If it's a full timestamp (YYYY-MM-DDTHH:MM:SS), extract time part
    if (timeString.includes('T')) {
        const timePart = timeString.split('T')[1];
        return timePart.substring(0, 5); // HH:MM
    }
    
    // If it's already just time (HH:MM:SS), take first 5 chars
    return timeString.substring(0, 5); // HH:MM
}
