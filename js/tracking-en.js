// Tracking Page JavaScript (English)

// Render RAL color swatches from a spalva string like "9005sm 9011ap 6005bl"
function renderColorSwatches(spalva) {
    if (!spalva || spalva === 'Nenurodyta') return spalva ? spalva : 'Not specified';
    // Extract all 4-digit RAL codes from the string
    const codes = [...spalva.matchAll(/\b(\d{4})/g)].map(m => m[1]);
    if (codes.length === 0) return spalva;
    const swatches = codes.map(code => {
        const hex = RAL_COLORS[code];
        if (!hex) return '';
        return `<span class="ral-swatch" style="background:${hex};" title="RAL ${code}"></span>`;
    }).join('');
    return swatches + ' ' + spalva;
}

// Translate DB stage names (Lithuanian) to English
function translateStage(stage) {
    const map = {
        'Priimtas':     'Received',
        'Smėliuojamas': 'Sandblasting',
        'Gruntuojamas': 'Priming',
        'Dažomas':      'Painting',
        'Matavimui':    'Ready for collection',
        'Atsiimtas':    'Collected',
    };
    return map[stage] || stage;
}

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
        showError(orderCode, 'The code must be exactly 5 characters long');
        return;
    }

    await trackOrder(orderCode);
});

// Track order function
async function trackOrder(orderCode) {
    resultsContainer.style.display = 'none';
    errorMessage.style.display = 'none';
    loadingSpinner.style.display = 'block';

    try {
        const response = await fetch(TRACK_ORDER_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: orderCode })
        });

        const result = await response.json();
        loadingSpinner.style.display = 'none';

        if (!response.ok || result.error) {
            if (response.status === 404) {
                showError(orderCode);
            } else {
                showError(orderCode, `Error: ${result.error || 'Unknown error'}`);
            }
            return;
        }

        displayResults(result);

    } catch (err) {
        loadingSpinner.style.display = 'none';
        showError(orderCode, `System error: ${err.message}`);
        console.error('Error fetching order:', err);
    }
}

// Display results
function displayResults(order) {
    const currentStage = order.current_stage || 'Priimtas';
    const needsSanding = order.requirements?.needs_sanding || false;
    const needsPriming = order.requirements?.needs_priming || false;
    const isSandblasted = order.progress?.sandblasted || false;
    const isReady = order.progress?.ready || false;
    const isPainted = order.progress?.painted || isReady;
    const isPrimed = isPainted && needsPriming;
    const isDelivered = order.progress?.delivered || false;
    const spalva = order.spalva_ir_pavirsuis || 'Nenurodyta';

    const stageMap = {
        'Priimtas':     'received',
        'Smėliuojamas': 'sanding',
        'Gruntuojamas': 'priming',
        'Dažomas':      'painting',
        'Matavimui':    'ready',
        'Atsiimtas':    'delivered'
    };

    const stageOrder = {
        'received': 1, 'sanding': 2, 'priming': 3,
        'painting': 4, 'ready': 5, 'delivered': 6
    };

    const currentProgress = stageMap[currentStage] || 'received';

    const html = `
        <div class="result-card">
            <div class="result-header">
                <h2>Order Status</h2>
                <div class="order-code-display">${order.unique_code}</div>
            </div>

            <!-- Order Details -->
            <div class="order-details">
                <h3>Order Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Colour &amp; Surface</span>
                        <span class="detail-value">${renderColorSwatches(spalva)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Sandblasting required</span>
                        <span class="detail-value ${needsSanding ? 'yes' : 'no'}">${needsSanding ? 'YES' : 'NO'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Priming required</span>
                        <span class="detail-value ${needsPriming ? 'yes' : 'no'}">${needsPriming ? 'YES' : 'NO'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Current stage</span>
                        <span class="detail-value">${translateStage(currentStage)}</span>
                    </div>
                </div>
            </div>

            <!-- Process Timeline -->
            <div class="progress-timeline">
                <h3 style="margin-bottom: 1.5rem;">Production Progress</h3>

                <!-- 1. Order received -->
                <div class="timeline-item completed">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Order received</h3>
                        <p>Your order has been accepted and is being processed</p>
                        <span class="status-badge completed">Done</span>
                    </div>
                </div>

                <!-- 2. Sandblasting (if needed) -->
                ${needsSanding ? `
                <div class="timeline-item ${isSandblasted ? 'completed' : (currentProgress === 'sanding' ? 'active' : 'pending')}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Sandblasting</h3>
                        <p>Surface preparation before coating</p>
                        <span class="status-badge ${isSandblasted ? 'completed' : (currentProgress === 'sanding' ? 'active' : 'pending')}">
                            ${isSandblasted ? 'Done' : (currentProgress === 'sanding' ? 'In progress' : 'Pending')}
                        </span>
                    </div>
                </div>
                ` : ''}

                <!-- 3. Priming (if needed) -->
                ${needsPriming ? `
                <div class="timeline-item ${isPrimed ? 'completed' : (currentProgress === 'priming' ? 'active' : 'pending')}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 19V5M5 12l7-7 7 7"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Priming</h3>
                        <p>Primer coat applied for better paint adhesion</p>
                        <span class="status-badge ${isPrimed ? 'completed' : (currentProgress === 'priming' ? 'active' : 'pending')}">
                            ${isPrimed ? 'Done' : (currentProgress === 'priming' ? 'In progress' : 'Pending')}
                        </span>
                    </div>
                </div>
                ` : ''}

                <!-- 4. Powder coating -->
                <div class="timeline-item ${isPainted ? 'completed' : (currentProgress === 'painting' ? 'active' : 'pending')}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Powder coating</h3>
                        <p>Coating applied in colour: <strong>${renderColorSwatches(spalva)}</strong></p>
                        <span class="status-badge ${isPainted ? 'completed' : (currentProgress === 'painting' ? 'active' : 'pending')}">
                            ${isPainted ? 'Done' : (currentProgress === 'painting' ? 'In progress' : 'Pending')}
                        </span>
                    </div>
                </div>

                <!-- 5. Ready for collection -->
                <div class="timeline-item ${isReady ? 'completed' : 'pending'}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 3h18v18H3zM3 9h18M9 21V9"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Ready for collection</h3>
                        <p>Order completed and ready to be collected</p>
                        <span class="status-badge ${isReady ? 'completed' : 'pending'}">
                            ${isReady ? 'Done' : 'Pending'}
                        </span>
                    </div>
                </div>

                <!-- 6. Collected -->
                <div class="timeline-item ${isDelivered ? 'completed' : 'pending'}">
                    <div class="timeline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"/>
                            <circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                    </div>
                    <div class="timeline-content">
                        <h3>Collected</h3>
                        <p>${isDelivered ? 'Order collected. Thank you!' : 'Awaiting your collection'}</p>
                        <span class="status-badge ${isDelivered ? 'completed' : 'pending'}">
                            ${isDelivered ? 'Done' : 'Pending'}
                        </span>
                    </div>
                </div>
            </div>

            <div style="text-align: center; margin-top: 2rem;">
                <button class="btn btn-secondary" onclick="document.getElementById('searchBox').scrollIntoView({behavior: 'smooth'}); document.getElementById('orderCode').value = ''; document.getElementById('orderCode').focus();">
                    Track another order
                </button>
            </div>
        </div>
    `;

    // Append photos section if available
    if (order.photos && order.photos.length > 0) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const resultCard = tempDiv.querySelector('.result-card');
        const photosSection = document.createElement('div');
        photosSection.className = 'order-photos';
        const cacheBust = new Date().toISOString().split('T')[0];
        photosSection.innerHTML = `
            <h3>Order Photos</h3>
            <div class="photos-grid">
                ${order.photos.map((url, i) => {
                    const src = url.includes('?') ? `${url}&cb=${cacheBust}` : `${url}?cb=${cacheBust}`;
                    return `
                    <div class="photo-item">
                        <img src="${src}" alt="Order photo ${i + 1}" loading="lazy"
                             onclick="openPhotoModal('${src}')"
                             onerror="this.parentElement.style.display='none'">
                    </div>`;
                }).join('')}
            </div>
        `;
        const progressTimeline = resultCard.querySelector('.progress-timeline');
        resultCard.insertBefore(photosSection, progressTimeline);
        resultsContainer.innerHTML = tempDiv.innerHTML;
    } else {
        resultsContainer.innerHTML = html;
    }

    resultsContainer.style.display = 'block';
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

// Check if order code is in URL (direct link from SMS)
window.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && code.length === 5) {
        orderCodeInput.value = code.toUpperCase();
        trackOrder(code.toUpperCase());
    }
});

// Photo modal
function openPhotoModal(url) {
    let modal = document.getElementById('photoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'photoModal';
        modal.className = 'photo-modal';
        modal.innerHTML = `
            <div class="photo-modal-backdrop" onclick="closePhotoModal()"></div>
            <div class="photo-modal-content">
                <button class="photo-modal-close" onclick="closePhotoModal()">&#x2715;</button>
                <img id="photoModalImg" src="" alt="Order photo">
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('photoModalImg').src = url;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePhotoModal() {
    const modal = document.getElementById('photoModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}
