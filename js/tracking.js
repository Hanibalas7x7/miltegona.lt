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
    const isSanded = order.is_sanded || false;
    const isPrimed = order.is_primed || false;
    const isPainted = order.is_painted || false;
    const isReady = order.is_ready || false;
    const isDelivered = order.is_delivered || false;
    const spalva = order.spalva_ir_pavirsuis || 'Nenurodyta';
    
    // Determine current stage
    let currentStage = 'received';
    if (isDelivered) currentStage = 'delivered';
    else if (isReady) currentStage = 'ready';
    else if (isPainted) curstatus?.is_sanded || false;
    const isPrimed = order.status?.is_primed || false;
    const isPainted = order.status?.is_painted || false;
    const isReady = order.status?.is_ready || false;
    const isDelivered = order.status?
        <div class="result-card">
            <div class="result-header">
                <h2>Užsakymo būklė</h2>
                <div class="order-code-display">${order.unique_code}</div>
            </div>
            
            <div class="progress-timeline">
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
                
                <!-- 2. Smėliavimas -->
                <div class="timeline-item ${isSanded ? 'completed' : (currentStage === 'received' ? 'active' : 'pending')}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Smėliavimas / Valymas</h3>
                        <p>Paviršiaus paruošimas prieš dažymą</p>
                        <span class="status-badge ${isSanded ? 'completed' : (currentStage === 'received' ? 'active' : 'pending')}">
                            ${isSanded ? 'Atlikta' : (currentStage === 'received' ? 'Vykdoma' : 'Laukiama')}
                        </span>
                    </div>
                </div>
                
                <!-- 3. Gruntavimas -->
                <div class="timeline-item ${isPrimed ? 'completed' : (currentStage === 'sanded' ? 'active' : 'pending')}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 19V5M5 12l7-7 7 7"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Gruntavimas</h3>
                        <p>Gruntuojamas paviršius geresniam dažų sukibimui</p>
                        <span class="status-badge ${isPrimed ? 'completed' : (currentStage === 'sanded' ? 'active' : 'pending')}">
                            ${isPrimed ? 'Atlikta' : (currentStage === 'sanded' ? 'Vykdoma' : 'Laukiama')}
                        </span>
                    </div>
                </div>
                
                <!-- 4. Dažymas -->
                <div class="timeline-item ${isPainted ? 'completed' : (currentStage === 'primed' ? 'active' : 'pending')}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Dažymas</h3>
                        <p>Miltelinis dažymas pasirinkta spalva: <strong>${spalva}</strong></p>
                        <span class="status-badge ${isPainted ? 'completed' : (currentStage === 'primed' ? 'active' : 'pending')}">
                            ${isPainted ? 'Atlikta' : (currentStage === 'primed' ? 'Vykdoma' : 'Laukiama')}
                        </span>
                    </div>
                </div>
                
                <!-- 5. Pabaigtas / Matavimui -->
                <div class="timeline-item ${isReady ? 'completed' : (currentStage === 'painted' ? 'active' : 'pending')}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 3h18v18H3zM3 9h18M9 21V9"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Pabaigtas / Matavimui</h3>
                        <p>Užsakymas pabaigtas ir ruošiamas atsiėmimui</p>
                        <span class="status-badge ${isReady ? 'completed' : (currentStage === 'painted' ? 'active' : 'pending')}">
                            ${isReady ? 'Atlikta' : (currentStage === 'painted' ? 'Vykdoma' : 'Laukiama')}
                        </span>
                    </div>
                </div>
                
                <!-- 6. Atsiimtas -->
                <div class="timeline-item ${isDelivered ? 'completed' : (currentStage === 'ready' ? 'active' : 'pending')}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"/>
                            <circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Atsiimtas</h3>
                        <p>${isDelivered ? 'Užsakymas atsiimtas. Ačiū!' : 'Laukiame jūsų atsiėmimo'}</p>
                        <span class="status-badge ${isDelivered ? 'completed' : (currentStage === 'ready' ? 'active' : 'pending')}">
                            ${isDelivered ? 'Atsiimta' : (currentStage === 'ready' ? 'Galima atsiimti' : 'Laukiama')}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="order-details">
                <h3>Užsakymo detalės</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Smėliavimas</span>
                        <span class="detail-value ${isSanded ? 'yes' : 'no'}">${isSanded ? 'TAIP' : 'NE'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Gruntavimas</span>
                        <span class="detail-value ${isPrimed ? 'yes' : 'no'}">${isPrimed ? 'TAIP' : 'NE'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Spalva</span>
                        <span class="detail-value">${spalva}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Būklė</span>
                        <span class="detail-value">${getStatusText(currentStage)}</span>
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

// Get status text
function getStatusText(stage) {
    const stages = {
        'received': 'Priimtas',
        'sanded': 'Smėliuojamas / Valomas',
        'primed': 'Gruntuojamas',
        'painted': 'Dažomas',
        'ready': 'Paruoštas atsiėmimui',
        'delivered': 'Atsiimtas'
    };
    return stages[stage] || 'Nežinoma';
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
