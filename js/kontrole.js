// Supabase Configuration
const SUPABASE_URL = 'https://xyzttzqvbescdpihvyfu.supabase.co';
const SUPABASE_ANON_KEY = '***REMOVED***';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elements
const loginScreen = document.getElementById('login-screen');
const controlPanel = document.getElementById('control-panel');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const codeForm = document.getElementById('code-form');
const codeTypeSelect = document.getElementById('code-type');
const singleDateGroup = document.getElementById('single-date-group');
const rangeDateGroup = document.getElementById('range-date-group');
const codesList = document.getElementById('codes-list');
const codeModal = document.getElementById('code-modal');
const generatedCodeInput = document.getElementById('generated-code');
const generatedLinkInput = document.getElementById('generated-link');
const copyCodeBtn = document.getElementById('copy-code-btn');
const copyLinkBtn = document.getElementById('copy-link-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const filterBtns = document.querySelectorAll('.filter-btn');

let currentFilter = 'all';

// Generate random 8-character code
function generateCode() {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

// Login - uses Edge Function with rate limiting (60 attempts per hour per IP)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Tikrinama...';
    loginError.textContent = '';
    
    try {
        // Call Edge Function to validate password
        // Rate limiting: 60 requests per hour per IP
        const response = await fetch('https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/validate-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Store password in localStorage (30 days) - transmitted over HTTPS only
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 30);
            localStorage.setItem('kontrole_password', password);
            localStorage.setItem('kontrole_auth_expiration', expirationDate.toISOString());
            
            loginScreen.style.display = 'none';
            controlPanel.style.display = 'block';
            loadCodes();
        } else {
            loginError.textContent = result.error || 'Neteisingas slaptažodis';
        }
    } catch (error) {
        console.error('Error logging in:', error);
        loginError.textContent = 'Klaida prisijungiant. Bandykite dar kartą.';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Prisijungti';
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('kontrole_password');
    localStorage.removeItem('kontrole_auth_expiration');
    loginScreen.style.display = 'flex';
    controlPanel.style.display = 'none';
    loginForm.reset();
    loginError.textContent = '';
});

// Check if already authenticated (valid for 30 days)
const savedPassword = localStorage.getItem('kontrole_password');
const authExpiration = localStorage.getItem('kontrole_auth_expiration');

if (savedPassword && authExpiration) {
    const expirationDate = new Date(authExpiration);
    
    if (expirationDate > new Date()) {
        // Session still valid
        loginScreen.style.display = 'none';
        controlPanel.style.display = 'block';
        loadCodes();
    } else {
        // Session expired, clear it
        localStorage.removeItem('kontrole_password');
        localStorage.removeItem('kontrole_auth_expiration');
    }
}

// Toggle date inputs based on code type
codeTypeSelect.addEventListener('change', (e) => {
    const type = e.target.value;
    singleDateGroup.style.display = type === 'single' ? 'block' : 'none';
    rangeDateGroup.style.display = type === 'range' ? 'block' : 'none';
    
    // Clear dates when switching
    document.getElementById('single-date').value = '';
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
});

// Generate code form submission
codeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const type = codeTypeSelect.value;
    const code = generateCode();
    const note = document.getElementById('code-note').value;
    
    let validFrom = null;
    let validTo = null;
    let unlimited = false;
    
    if (type === 'single') {
        const date = document.getElementById('single-date').value;
        if (!date) {
            showMessage('Prašome pasirinkti datą', 'error');
            return;
        }
        // Use local timezone - add 'T' to make it local time, not UTC
        validFrom = new Date(date + 'T00:00:00').toISOString();
        validTo = new Date(date + 'T23:59:59').toISOString();
    } else if (type === 'range') {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        if (!startDate || !endDate) {
            showMessage('Prašome pasirinkti abi datas', 'error');
            return;
        }
        // Use local timezone
        validFrom = new Date(startDate + 'T00:00:00').toISOString();
        validTo = new Date(endDate + 'T23:59:59').toISOString();
    } else {
        unlimited = true;
    }
    
    try {
        // Call Edge Function to create code (secure)
        const password = localStorage.getItem('kontrole_password');
        
        const response = await fetch('https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/manage-codes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'x-password': password
            },
            body: JSON.stringify({
                action: 'create',
                code: code,
                valid_from: validFrom,
                valid_to: validTo,
                unlimited: unlimited,
                note: note || null
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Klaida kuriant kodą');
        }
        
        // Show modal with code
        generatedCodeInput.value = code;
        generatedLinkInput.value = `${window.location.origin}/atidaryti/?code=${code}`;
        codeModal.classList.add('show');
        
        // Reset form
        codeForm.reset();
        setDefaultDates();
        codeTypeSelect.value = 'single';
        singleDateGroup.style.display = 'block';
        rangeDateGroup.style.display = 'none';
        
        // Reload codes list
        loadCodes();
        
    } catch (error) {
        console.error('Error generating code:', error);
        showMessage(error.message || 'Klaida generuojant kodą', 'error');
    }
});

// Load codes from database
async function loadCodes() {
    try {
        codesList.innerHTML = '<p class="loading-message">Kraunama...</p>';
        
        // Call Edge Function to get codes (secure)
        const password = localStorage.getItem('kontrole_password');
        
        const response = await fetch('https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/manage-codes', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'x-password': password
            }
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Klaida gaunant kodus');
        }
        
        if (result.data.length === 0) {
            codesList.innerHTML = '<p class="empty-message">Dar nėra sukurtų kodų</p>';
            return;
        }
        
        displayCodes(result.data);
        
    } catch (error) {
        console.error('Error loading codes:', error);
        codesList.innerHTML = '<p class="empty-message">Klaida kraunant duomenis</p>';
    }
}

// Display codes
function displayCodes(codes) {
    const now = new Date();
    
    let filteredCodes = codes;
    if (currentFilter === 'active') {
        filteredCodes = codes.filter(code => isCodeActive(code, now));
    } else if (currentFilter === 'expired') {
        filteredCodes = codes.filter(code => !isCodeActive(code, now));
    }
    
    if (filteredCodes.length === 0) {
        codesList.innerHTML = '<p class="empty-message">Nėra kodų pagal šį filtrą</p>';
        return;
    }
    
    codesList.innerHTML = filteredCodes.map(code => {
        const status = getCodeStatus(code, now);
        const statusInfo = getStatusInfo(status);
        const validityText = getValidityText(code);
        
        return `
            <div class="code-item ${status !== 'active' ? status : ''}">
                <div class="code-item-code">${code.code}</div>
                <div class="code-item-info">
                    <p><strong>Galiojimas:</strong> ${validityText}</p>
                    ${code.note ? `<p><strong>Pastaba:</strong> ${code.note}</p>` : ''}
                    <p><strong>Sukurta:</strong> ${formatDate(code.created_at)}</p>
                    <span class="status-badge ${statusInfo.class}">
                        ${statusInfo.text}
                    </span>
                </div>
                <div class="code-item-actions">
                    <button class="btn-icon" onclick="copyCode('${code.code}')" title="Kopijuoti kodą">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="shareCode('${code.code}')" title="Dalintis nuoroda">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                    </button>
                    <button class="btn-icon delete" onclick="deleteCode('${code.id}')" title="Ištrinti">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Check if code is active
function isCodeActive(code, now) {
    if (code.unlimited) return true;
    const validFrom = new Date(code.valid_from);
    const validTo = new Date(code.valid_to);
    return now >= validFrom && now <= validTo;
}

// Get code status
function getCodeStatus(code, now) {
    if (code.unlimited) return 'active';
    
    const validFrom = new Date(code.valid_from);
    const validTo = new Date(code.valid_to);
    
    if (now < validFrom) return 'pending'; // Dar negalioja
    if (now > validTo) return 'expired'; // Pasibaigęs
    return 'active'; // Aktyvus
}

// Get status text and badge
function getStatusInfo(status) {
    switch (status) {
        case 'pending':
            return { text: 'Laukiama', class: 'pending' };
        case 'active':
            return { text: 'Aktyvus', class: 'active' };
        case 'expired':
            return { text: 'Pasibaigęs', class: 'expired' };
        default:
            return { text: 'Nežinoma', class: 'unknown' };
    }
}

// Get validity text
function getValidityText(code) {
    if (code.unlimited) return 'Neribotai';
    
    const from = new Date(code.valid_from);
    const to = new Date(code.valid_to);
    
    // Format dates in Lithuanian time
    const formatDateShort = (date) => date.toLocaleDateString('lt-LT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Europe/Vilnius'
    });
    
    // Check if same day (comparing dates only, not times)
    const fromDate = formatDateShort(from);
    const toDate = formatDateShort(to);
    
    if (fromDate === toDate) {
        return fromDate;
    }
    
    return `${fromDate} - ${toDate}`;
}

// Format date to Lithuanian local time
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('lt-LT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Vilnius'
    });
}

// Copy code
window.copyCode = async function(code) {
    try {
        await navigator.clipboard.writeText(code);
        showMessage('Kodas nukopijuotas', 'success');
    } catch (error) {
        showMessage('Nepavyko nukopijuoti', 'error');
    }
};

// Share code
window.shareCode = async function(code) {
    const link = `${window.location.origin}/atidaryti/?code=${code}`;
    try {
        await navigator.clipboard.writeText(link);
        showMessage('Nuoroda nukopijuota', 'success');
    } catch (error) {
        showMessage('Nepavyko nukopijuoti', 'error');
    }
};

// Delete code
window.deleteCode = async function(id) {
    if (!confirm('Ar tikrai norite ištrinti šį kodą?')) return;
    
    try {
        // Call Edge Function to delete code (secure)
        const password = localStorage.getItem('kontrole_password');
        
        const response = await fetch('https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/manage-codes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'x-password': password
            },
            body: JSON.stringify({
                action: 'delete',
                id: id
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Klaida trinant kodą');
        }
        
        showMessage('Kodas ištrintas', 'success');
        loadCodes();
    } catch (error) {
        console.error('Error deleting code:', error);
        showMessage(error.message || 'Klaida trinant kodą', 'error');
    }
};

// Filter codes
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        loadCodes();
    });
});

// Modal actions
copyCodeBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(generatedCodeInput.value);
        showMessage('Kodas nukopijuotas', 'success');
    } catch (error) {
        showMessage('Nepavyko nukopijuoti', 'error');
    }
});

copyLinkBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(generatedLinkInput.value);
        showMessage('Nuoroda nukopijuota', 'success');
    } catch (error) {
        showMessage('Nepavyko nukopijuoti', 'error');
    }
});

closeModalBtn.addEventListener('click', () => {
    codeModal.classList.remove('show');
});

// Close modal on outside click
codeModal.addEventListener('click', (e) => {
    if (e.target === codeModal) {
        codeModal.classList.remove('show');
    }
});

// Show message (reuse from main.js)
function showMessage(message, type) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #1a1d23;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        max-width: 400px;
        width: 90%;
        text-align: center;
        animation: scaleIn 0.3s ease;
    `;
    
    const icon = type === 'success' ? '✓' : '✕';
    const iconColor = type === 'success' ? '#3ba560' : '#ef4444';
    
    modal.innerHTML = `
        <div style="
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: ${iconColor};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            margin: 0 auto 1rem;
            font-weight: bold;
        ">${icon}</div>
        <h3 style="
            margin: 0 0 1rem;
            color: #e5e7eb;
            font-size: 1.25rem;
        ">${type === 'success' ? 'Sėkmingai!' : 'Klaida'}</h3>
        <p style="
            margin: 0 0 1.5rem;
            color: #9ca3af;
            line-height: 1.5;
        ">${message}</p>
        <button id="modal-ok-btn" style="
            background: ${iconColor};
            color: white;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
        ">Gerai</button>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const okBtn = modal.querySelector('#modal-ok-btn');
    okBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    okBtn.addEventListener('mouseenter', () => {
        okBtn.style.opacity = '0.8';
    });
    
    okBtn.addEventListener('mouseleave', () => {
        okBtn.style.opacity = '1';
    });
}
