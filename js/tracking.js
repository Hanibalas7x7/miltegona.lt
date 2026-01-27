// Tracking Page JavaScript

// Edge Function URL
const TRACK_ORDER_ENDPOINT = 'https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/track-order';

// Form elements
const trackingForm = document.getElementById('trackingForm');
const orderCodeInput = document.getElementById('orderCode');
const searchBox = document.getElementById('searchBox');
const resultsContainer = document.getElementById('resultsContainer');
const errorMessage = document.getElementById('errorMessage');
const loadingSpinner = document.getElementById('loadingSpinner');

// Convert input to uppercase as user types
orderCodeInput.addEventListener('input', function(e) {
    this.value = this.value.toUpperCase();
});

// Handle form submission
trackingForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const orderCode = orderCodeInput.value.trim().toUpperCase();
    
    if (orderCode.length !== 5) {
        showError(orderCode, 'Kodas turi būti 5 simbolių ilgio');
        return;
    }
    
    await trackOrder(orderCode);
});

// Track order function
async function trackOrder(orderCode) {
    // Hide previous results
    resultsContainer.style.display = 'none';
    errorMessage.style.display = 'none';
    
    // Show loading
    loadingSpinner.style.display = 'block';
    
    try {
        console.log('🔍 Searching for order:', orderCode);
        
        // Call Edge Function
        const response = await fetch(TRACK_ORDER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: orderCode })
        });
        
        const result = await response.json();
        
        console.log('📊 Response:', { status: response.status, result });
        
        loadingSpinner.style.display = 'none';
        
        if (!response.ok || result.error) {
            console.error('❌ Error:', result.error);
            
            if (response.status === 404) {
                showError(orderCode); // Not found
            } else {
                showError(orderCode, `Klaida: ${result.error || 'Nežinoma klaida'}`);
            }
            return;
        }
        
        console.log('✅ Order found:', result);
        // Show results
        displayResults(result);
        
    } catch (err) {
        loadingSpinner.style.display = 'none';
        showError(orderCode, `Sistemos klaida: ${err.message}`);
        console.error('💥 Error fetching order:', err);
    }
}

// Display results
function displayResults(order) {
    // Extract data from response
    const currentStage = order.current_stage || 'Priimtas';
    const needsSanding = order.requirements?.needs_sanding || false;
    const needsPriming = order.requirements?.needs_priming || false;
    const isSandblasted = order.progress?.sandblasted || false;
    const spalva = order.spalva_ir_pavirsuis || 'Nenurodyta';
    
    // Map painted_tag to progress stages
    const stageMap = {
        'Priimtas': 'received',
        'Smėliuojamas': 'sanding',
        'Gruntuojamas': 'priming',
        'Dažomas': 'painting',
        'Matavimui': 'ready',
        'Atsiimtas': 'delivered'
    };
    
    // Stage order for comparison
    const stageOrder = {
        'received': 1,
        'sanding': 2,
        'priming': 3,
        'painting': 4,
        'ready': 5,
        'delivered': 6
    };
    
    const currentProgress = stageMap[currentStage] || 'received';
    
    const html = `
        <div class="result-card">
            <div class="result-header">
                <h2>Užsakymo būklė</h2>
                <div class="order-code-display">${order.unique_code}</div>
            </div>
            
            <!-- Order Details First -->
            <div class="order-details">
                <h3>Užsakymo informacija</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Spalva ir paviršius</span>
                        <span class="detail-value">${spalva}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Turi būti smėliuojamas</span>
                        <span class="detail-value ${needsSanding ? 'yes' : 'no'}">${needsSanding ? 'TAIP' : 'NE'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Turi būti gruntuojamas</span>
                        <span class="detail-value ${needsPriming ? 'yes' : 'no'}">${needsPriming ? 'TAIP' : 'NE'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Dabartinė būsena</span>
                        <span class="detail-value">${currentStage}</span>
                    </div>
                </div>
            </div>
            
            <!-- Process Timeline -->
            <div class="progress-timeline">
                <h3 style="margin-bottom: 1.5rem;">Gamybos procesas</h3>
                
                <!-- 1. Užsakymas priimtas -->
                <div class="timeline-item completed">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Užsakymas priimtas</h3>
                        <p>Jūsų užsakymas priimtas ir pradėtas vykdyti</p>
                        <span class="status-badge completed">Atlikta</span>
                    </div>
                </div>
                
                <!-- 2. Smėliavimas (if needed) -->
                ${needsSanding ? `
                <div class="timeline-item ${isSandblasted ? 'completed' : (currentProgress === 'sanding' ? 'active' : 'pending')}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Smėliavimas / Valymas</h3>
                        <p>Paviršiaus paruošimas prieš dažymą</p>
                        <span class="status-badge ${isSandblasted ? 'completed' : (currentProgress === 'sanding' ? 'active' : 'pending')}">
                            ${isSandblasted ? 'Atlikta' : (currentProgress === 'sanding' ? 'Vykdoma' : 'Laukiama')}
                        </span>
                    </div>
                </div>
                ` : ''}
                
                <!-- 3. Gruntavimas (if needed) -->
                ${needsPriming ? `
                <div class="timeline-item ${(stageOrder[currentProgress] > stageOrder['priming']) ? 'completed' : (currentProgress === 'priming' ? 'active' : 'pending')}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 19V5M5 12l7-7 7 7"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Gruntavimas</h3>
                        <p>Gruntuojamas paviršius geresniam dažų sukibimui</p>
                        <span class="status-badge ${(stageOrder[currentProgress] > stageOrder['priming']) ? 'completed' : (currentProgress === 'priming' ? 'active' : 'pending')}">
                            ${(stageOrder[currentProgress] > stageOrder['priming']) ? 'Atlikta' : (currentProgress === 'priming' ? 'Vykdoma' : 'Laukiama')}
                        </span>
                    </div>
                </div>
                ` : ''}
                
                <!-- 4. Dažymas -->
                <div class="timeline-item ${currentProgress === 'painting' ? 'active' : (stageOrder[currentProgress] > stageOrder['painting'] ? 'completed' : 'pending')}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Dažymas</h3>
                        <p>Miltelinis dažymas spalva: <strong>${spalva}</strong></p>
                        <span class="status-badge ${currentProgress === 'painting' ? 'active' : (stageOrder[currentProgress] > stageOrder['painting'] ? 'completed' : 'pending')}">
                            ${currentProgress === 'painting' ? 'Vykdoma' : (stageOrder[currentProgress] > stageOrder['painting'] ? 'Atlikta' : 'Laukiama')}
                        </span>
                    </div>
                </div>
                
                <!-- 5. Pabaigtas / Galima atsiimti -->
                <div class="timeline-item ${currentProgress === 'ready' ? 'active' : (currentProgress === 'delivered' ? 'completed' : 'pending')}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 3h18v18H3zM3 9h18M9 21V9"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Pabaigtas</h3>
                        <p>Užsakymas baigtas ir galima atsiimti</p>
                        <span class="status-badge ${currentProgress === 'ready' ? 'active' : (currentProgress === 'delivered' ? 'completed' : 'pending')}">
                            ${currentProgress === 'ready' ? 'Galima atsiimti' : (currentProgress === 'delivered' ? 'Atsiimta' : 'Laukiama')}
                        </span>
                    </div>
                </div>
                
                <!-- 6. Atsiimtas -->
                <div class="timeline-item ${currentProgress === 'delivered' ? 'completed' : 'pending'}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"/>
                            <circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Atsiimtas</h3>
                        <p>${currentProgress === 'delivered' ? 'Užsakymas atsiimtas. Ačiū!' : 'Laukiame jūsų atsiėmimo'}</p>
                        <span class="status-badge ${currentProgress === 'delivered' ? 'completed' : 'pending'}">
                            ${currentProgress === 'delivered' ? 'Atsiimta' : 'Laukiama'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 2rem;">
                <button class="btn btn-secondary" onclick="document.getElementById('searchBox').scrollIntoView({behavior: 'smooth'}); document.getElementById('orderCode').value = ''; document.getElementById('orderCode').focus();">
                    Ieškoti kito užsakymo
                </button>
            </div>
        </div>
    `;
    
    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';
    
    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Show error message
function showError(orderCode, customMessage = null) {
    document.getElementById('errorCode').textContent = orderCode;
    
    if (customMessage) {
        errorMessage.querySelector('p').textContent = customMessage;
    }
    
    errorMessage.style.display = 'block';
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Check if order code is in URL (for direct links from SMS)
window.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && code.length === 5) {
        orderCodeInput.value = code.toUpperCase();
        trackOrder(code.toUpperCase());
    }
});
