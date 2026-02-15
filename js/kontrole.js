// Suppress Cloudflare cookie warnings in console
(function() {
    const originalError = console.error;
    console.error = function(...args) {
        const message = args[0]?.toString() || '';
        if (message.includes('__cf_bm') || message.includes('invalid domain')) {
            return; // Ignore Cloudflare cookie warnings
        }
        originalError.apply(console, args);
    };
})();

// Edge Functions Configuration
const EDGE_FUNCTIONS_URL = 'https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1';
const SUPABASE_URL = 'https://xyzttzqvbescdpihvyfu.supabase.co';
const GALLERY_EDGE_URL = `${EDGE_FUNCTIONS_URL}/manage-gallery`;

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

// Edit modal elements
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editCodeDisplay = document.getElementById('edit-code-display');
const editCodeTypeSelect = document.getElementById('edit-code-type');
const editSingleDateGroup = document.getElementById('edit-single-date-group');
const editRangeDateGroup = document.getElementById('edit-range-date-group');
const editSingleDateInput = document.getElementById('edit-single-date');
const editValidFromInput = document.getElementById('edit-start-date');
const editValidToInput = document.getElementById('edit-end-date');
const editNoteInput = document.getElementById('edit-code-note');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

let currentFilter = 'all';
let allCodes = []; // Store all codes for editing
let currentEditingId = null;

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
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/validate-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-password': password
            }
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
        
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/manage-codes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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
        
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/manage-codes`, {
            method: 'GET',
            headers: {
                'x-password': password
            }
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Klaida gaunant kodus');
        }
        
        if (result.data.length === 0) {
            codesList.innerHTML = '<p class="empty-message">Dar nėra sukurtų kodų</p>';
            allCodes = [];
            return;
        }
        
        allCodes = result.data; // Store for editing
        displayCodes(allCodes);
        
    } catch (error) {
        console.error('Error loading codes:', error);
        codesList.innerHTML = '<p class="empty-message">Klaida kraunant duomenis</p>';
    }
}

// Display codes
function displayCodes(codes) {
    // Get current date in Lithuanian timezone as YYYY-MM-DD string
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Vilnius' });
    
    let filteredCodes = codes;
    if (currentFilter === 'active') {
        filteredCodes = codes.filter(code => isCodeActive(code, today));
    } else if (currentFilter === 'expired') {
        filteredCodes = codes.filter(code => !isCodeActive(code, today));
    }
    
    if (filteredCodes.length === 0) {
        codesList.innerHTML = '<p class="empty-message">Nėra kodų pagal šį filtrą</p>';
        return;
    }
    
    codesList.innerHTML = filteredCodes.map(code => {
        const status = getCodeStatus(code, today);
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
                    <button class="btn-icon" onclick="editCode('${code.id}')" title="Redaguoti">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
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

// Convert ISO timestamp to Lithuanian timezone date string (YYYY-MM-DD)
function getDateInLithuaniaTimezone(isoString) {
    return new Date(isoString).toLocaleDateString('sv-SE', { timeZone: 'Europe/Vilnius' });
}

// Check if code is active
function isCodeActive(code, today) {
    if (code.unlimited) return true;
    const validFrom = getDateInLithuaniaTimezone(code.valid_from);
    const validTo = getDateInLithuaniaTimezone(code.valid_to);
    return today >= validFrom && today <= validTo;
}

// Get code status
function getCodeStatus(code, today) {
    if (code.unlimited) return 'active';
    
    const validFrom = getDateInLithuaniaTimezone(code.valid_from);
    const validTo = getDateInLithuaniaTimezone(code.valid_to);
    
    if (today < validFrom) return 'pending'; // Dar negalioja
    if (today > validTo) return 'expired'; // Pasibaigęs
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
        
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/manage-codes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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

// Edit code
window.editCode = function(id) {
    // Find code in allCodes array
    const code = allCodes.find(c => c.id === id);
    if (!code) {
        showMessage('Kodas nerastas', 'error');
        return;
    }
    
    currentEditingId = id;
    
    // Populate form fields
    editCodeDisplay.value = code.code;
    editNoteInput.value = code.note || '';
    
    // Determine code type and set dates
    if (code.unlimited) {
        editCodeTypeSelect.value = 'unlimited';
        editSingleDateGroup.style.display = 'none';
        editRangeDateGroup.style.display = 'none';
    } else if (code.valid_from === code.valid_to) {
        editCodeTypeSelect.value = 'single';
        editSingleDateInput.value = code.valid_from;
        editSingleDateGroup.style.display = 'block';
        editRangeDateGroup.style.display = 'none';
    } else {
        editCodeTypeSelect.value = 'range';
        editValidFromInput.value = code.valid_from;
        editValidToInput.value = code.valid_to;
        editSingleDateGroup.style.display = 'none';
        editRangeDateGroup.style.display = 'block';
    }
    
    // Show modal
    editModal.classList.add('show');
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

// Edit modal event listeners
editCodeTypeSelect.addEventListener('change', (e) => {
    const type = e.target.value;
    if (type === 'single') {
        editSingleDateGroup.style.display = 'block';
        editRangeDateGroup.style.display = 'none';
    } else if (type === 'range') {
        editSingleDateGroup.style.display = 'none';
        editRangeDateGroup.style.display = 'block';
    } else { // unlimited
        editSingleDateGroup.style.display = 'none';
        editRangeDateGroup.style.display = 'none';
    }
});

cancelEditBtn.addEventListener('click', () => {
    editModal.classList.remove('show');
    currentEditingId = null;
});

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentEditingId) {
        showMessage('Klaida: kodas nerastas', 'error');
        return;
    }
    
    const type = editCodeTypeSelect.value;
    const note = editNoteInput.value.trim();
    
    let valid_from, valid_to, unlimited;
    
    if (type === 'unlimited') {
        unlimited = true;
        valid_from = null;
        valid_to = null;
    } else if (type === 'single') {
        const date = editSingleDateInput.value;
        if (!date) {
            showMessage('Prašome pasirinkti datą', 'error');
            return;
        }
        unlimited = false;
        valid_from = date;
        valid_to = date;
    } else { // range
        valid_from = editValidFromInput.value;
        valid_to = editValidToInput.value;
        if (!valid_from || !valid_to) {
            showMessage('Prašome pasirinkti abi datas', 'error');
            return;
        }
        if (valid_from > valid_to) {
            showMessage('Pradžios data negali būti vėlesnė už pabaigos datą', 'error');
            return;
        }
        unlimited = false;
    }
    
    try {
        const password = localStorage.getItem('kontrole_password');
        
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/manage-codes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-password': password
            },
            body: JSON.stringify({
                action: 'update',
                id: currentEditingId,
                valid_from: valid_from,
                valid_to: valid_to,
                unlimited: unlimited,
                note: note
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Klaida atnaujinant kodą');
        }
        
        showMessage('Kodas atnaujintas', 'success');
        editModal.classList.remove('show');
        currentEditingId = null;
        loadCodes();
    } catch (error) {
        console.error('Error updating code:', error);
        showMessage(error.message || 'Klaida atnaujinant kodą', 'error');
    }
});

// Initialize flatpickr for all date inputs with Lithuanian locale
document.addEventListener('DOMContentLoaded', () => {
    const dateConfig = {
        locale: 'lt',
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'Y-m-d',
        allowInput: true
    };
    
    // Main form date inputs
    flatpickr('#single-date', dateConfig);
    flatpickr('#start-date', dateConfig);
    flatpickr('#end-date', dateConfig);
    
    // Edit form date inputs
    flatpickr('#edit-single-date', dateConfig);
    flatpickr('#edit-start-date', dateConfig);
    flatpickr('#edit-end-date', dateConfig);
});

// ==================== GALLERY MANAGEMENT ====================

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        
        const targetContent = document.getElementById(`${targetTab}-tab`);
        if (targetContent) {
            targetContent.classList.add('active');
            targetContent.style.display = 'block';
            
            // Load gallery when switching to gallery tab
            if (targetTab === 'gallery') {
                loadGalleryImages();
            }
        }
    });
});

// Gallery image preview
const galleryImageInput = document.getElementById('gallery-image');
const uploadPreview = document.getElementById('upload-preview');
const previewImage = document.getElementById('preview-image');
const previewSize = document.getElementById('preview-size');

if (galleryImageInput) {
    galleryImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewSize.textContent = `Originalus dydis: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
                uploadPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
}

// Helper function to get image dimensions
async function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Nepavyko nuskaityti nuotraukos dimensijų'));
        };
        
        img.src = url;
    });
}

// Helper function to convert image to AVIF blob at specific size
async function imageToAVIF(file, maxWidth, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = () => {
            URL.revokeObjectURL(url);
            
            // Calculate dimensions
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = Math.round((height / width) * maxWidth);
                width = maxWidth;
            }
            
            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Try AVIF first, fallback to WebP, then JPEG
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        console.log(`Converted to AVIF: ${width}x${height} = ${(blob.size/1024).toFixed(1)}KB`);
                        resolve({ blob, width, height });
                    } else {
                        // AVIF not supported, try WebP
                        console.warn('AVIF not supported, trying WebP');
                        canvas.toBlob(
                            (webpBlob) => {
                                if (webpBlob) {
                                    console.log(`Converted to WebP: ${width}x${height} = ${(webpBlob.size/1024).toFixed(1)}KB`);
                                    resolve({ blob: webpBlob, width, height });
                                } else {
                                    // WebP also failed, use JPEG
                                    canvas.toBlob(
                                        (jpegBlob) => {
                                            if (jpegBlob) {
                                                console.log(`Converted to JPEG: ${width}x${height} = ${(jpegBlob.size/1024).toFixed(1)}KB`);
                                                resolve({ blob: jpegBlob, width, height });
                                            } else {
                                                reject(new Error('Nepavyko konvertuoti nuotraukos'));
                                            }
                                        },
                                        'image/jpeg',
                                        quality
                                    );
                                }
                            },
                            'image/webp',
                            quality
                        );
                    }
                },
                'image/avif',
                quality
            );
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Nepavyko įkelti nuotrauką'));
        };
        
        img.src = url;
    });
}

// Gallery upload form
const galleryUploadForm = document.getElementById('gallery-upload-form');
const uploadLoadingOverlay = document.getElementById('upload-loading-overlay');
const loadingStatusText = document.getElementById('loading-status-text');

if (galleryUploadForm) {
    galleryUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const uploadBtn = document.getElementById('upload-btn');
        const originalText = uploadBtn.textContent;
        uploadBtn.disabled = true;
        
        try {
            const file = galleryImageInput.files[0];
            if (!file) {
                throw new Error('Pasirinkite nuotrauką');
            }
            
            const originalSize = file.size;
            
            // Show loading overlay
            uploadLoadingOverlay.style.display = 'flex';
            loadingStatusText.textContent = 'Nuskaitoma nuotrauka...';
            
            // Get image dimensions
            const imgDimensions = await getImageDimensions(file);
            
            // Create FormData with original image (Edge Function will compress via TinyPNG API)
            const formData = new FormData();
            formData.append('image', file);
            formData.append('category', document.getElementById('gallery-category').value);
            formData.append('title', document.getElementById('gallery-title').value);
            formData.append('description', document.getElementById('gallery-description').value);
            formData.append('width', imgDimensions.width.toString());
            formData.append('height', imgDimensions.height.toString());
            
            const password = localStorage.getItem('kontrole_password');
            
            loadingStatusText.textContent = 'Komprimuojama į AVIF su TinyPNG...';
            
            const response = await fetch(GALLERY_EDGE_URL, {
                method: 'POST',
                headers: {
                    'x-password': password
                },
                body: formData
            });
            
            const result = await response.json();
            console.log('Upload response:', { status: response.status, result });
            
            if (!result.success) {
                const errorMsg = result.details ? `${result.error}: ${result.details}` : result.error;
                throw new Error(errorMsg || 'Klaida įkeliant nuotrauką');
            }
            
            const totalSize = result.data?.file_size || 0;
            const compressionRatio = totalSize > 0 ? ((1 - (totalSize / originalSize)) * 100).toFixed(1) : '?';
            const apiUsage = result.data?.apiUsage;
            const apiUsageText = apiUsage && typeof apiUsage === 'object' 
                ? `${apiUsage.thisUpload} šiam įkėlimui, ${apiUsage.monthTotal} iš viso šį mėnesį` 
                : apiUsage || '?';
            
            showMessage(`Nuotrauka įkelta! Kompresija: ${compressionRatio}% (${(originalSize/1024/1024).toFixed(1)}MB → ${(totalSize/1024).toFixed(0)}KB AVIF). TinyPNG API: ${apiUsageText}`, 'success');
            
            // Reset form
            galleryUploadForm.reset();
            uploadPreview.style.display = 'none';
            
            // Reload gallery
            loadGalleryImages();
            
        } catch (error) {
            console.error('Error uploading image:', error);
            showMessage(error.message || 'Klaida įkeliant nuotrauką', 'error');
        } finally {
            // Hide loading overlay
            uploadLoadingOverlay.style.display = 'none';
            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
        }
    });
}

// Gallery filter
let currentGalleryFilter = 'all';
document.querySelectorAll('.gallery-filter .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.gallery-filter .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentGalleryFilter = btn.dataset.category;
        loadGalleryImages(currentGalleryFilter);
    });
});

// Load gallery images
async function loadGalleryImages(category = 'all') {
    const galleryGrid = document.getElementById('gallery-grid');
    if (!galleryGrid) return;
    
    galleryGrid.innerHTML = '<p class="loading-message">Kraunama...</p>';
    
    try {
        const password = localStorage.getItem('kontrole_password');
        if (!password) {
            galleryGrid.innerHTML = '<p class="error-message">Prisijunkite pirmiausia</p>';
            return;
        }
        
        const url = category === 'all' 
            ? GALLERY_EDGE_URL 
            : `${GALLERY_EDGE_URL}?category=${category}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-password': password
            }
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            const errorMsg = result.error || result.details || response.statusText || 'Nežinoma klaida';
            console.error('Gallery API error:', { status: response.status, result });
            throw new Error(`Klaida gaunant nuotraukas: ${errorMsg}`);
        }
        
        const images = result.data;
        
        if (images.length === 0) {
            galleryGrid.innerHTML = '<p class="empty-message">Nėra nuotraukų</p>';
            return;
        }
        
        galleryGrid.innerHTML = images.map(img => {
            const bucketUrl = `${EDGE_FUNCTIONS_URL.replace('/functions/v1', '')}/storage/v1/object/public/gallery-images`;
            const thumbnailUrl = `${bucketUrl}/${img.thumbnail_path}`;
            const thumbnailSmallUrl = img.thumbnail_small_path ? `${bucketUrl}/${img.thumbnail_small_path}` : thumbnailUrl;
            const fullUrl = `${bucketUrl}/${img.storage_path}`;
            
            const categoryNames = {
                'metalwork': 'Metalinės konstrukcijos',
                'furniture': 'Baldai',
                'automotive': 'Automobilių dalys',
                'industrial': 'Pramoninė įranga'
            };
            
            return `
                <div class="gallery-item">
                    <img src="${thumbnailUrl}" 
                         srcset="${thumbnailSmallUrl} 200w, ${thumbnailUrl} 400w"
                         sizes="(max-width: 768px) 150px, 250px"
                         alt="${img.title || 'Gallery image'}" 
                         class="gallery-item-image" 
                         onclick="window.open('${fullUrl}', '_blank')">
                    <div class="gallery-item-info">
                        <div class="gallery-item-title">${img.title || img.filename}</div>
                        <div class="gallery-item-meta">
                            <span class="gallery-item-category">${categoryNames[img.category]}</span>
                            <span>${(img.file_size / 1024).toFixed(0)}KB</span>
                        </div>
                        ${img.description ? `<p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">${img.description}</p>` : ''}
                        <div class="gallery-item-actions">
                            <button class="btn-delete" onclick="deleteGalleryImage('${img.id}')">Ištrinti</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading gallery:', error);
        galleryGrid.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}

// Delete gallery image
window.deleteGalleryImage = async function(id) {
    if (!confirm('Ar tikrai norite ištrinti šią nuotrauką?')) return;
    
    try {
        const password = localStorage.getItem('kontrole_password');
        
        const response = await fetch(GALLERY_EDGE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-password': password
            },
            body: JSON.stringify({
                action: 'delete',
                id: id
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Klaida trinant nuotrauką');
        }
        
        showMessage('Nuotrauka ištrinta', 'success');
        loadGalleryImages(currentGalleryFilter);
        
    } catch (error) {
        console.error('Error deleting image:', error);
        showMessage(error.message || 'Klaida trinant nuotrauką', 'error');
    }
};

