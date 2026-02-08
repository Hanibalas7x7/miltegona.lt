// Paint Management JavaScript
// Handles paint CRUD operations for darbuotojai portal

// Use global EDGE_FUNCTIONS_URL from darbuotojai.js (no redeclaration)

let allPaints = [];
let sessionToken = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Get session token from localStorage (same key as darbuotojai.js uses)
    sessionToken = localStorage.getItem('darbuotojai_session');
    
    // Setup tab event to load paints when paints tab is clicked
    const paintsTabBtn = document.querySelector('[data-tab="paints"]');
    if (paintsTabBtn) {
        paintsTabBtn.addEventListener('click', () => {
            loadPaints();
        });
    }

    // Setup button event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Add paint button
    document.getElementById('add-paint-btn')?.addEventListener('click', () => {
        openPaintModal('add');
    });

    // Refresh paints button
    document.getElementById('refresh-paints-btn')?.addEventListener('click', () => {
        loadPaints();
    });

    // Search input
    document.getElementById('paint-search-input')?.addEventListener('input', (e) => {
        filterPaints(e.target.value);
    });

    // Paint form submit
    document.getElementById('paint-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        savePaint();
    });

    // Weight form submit
    document.getElementById('weight-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveWeight();
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
}

// Load all paints
async function loadPaints() {
    const content = document.getElementById('paints-content');
    if (!content) return;

    content.innerHTML = '<p class="loading-message">Kraunama...</p>';

    try {
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/get-all-paints-admin`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load paints');
        }

        allPaints = data.paints || [];
        renderPaints(allPaints);

    } catch (error) {
        console.error('Error loading paints:', error);
        content.innerHTML = `<p class="error-message">Klaida įkeliant dažus: ${error.message}</p>`;
    }
}

// Render paints table
function renderPaints(paints) {
    const content = document.getElementById('paints-content');
    if (!content) return;

    if (paints.length === 0) {
        content.innerHTML = '<p class="info-message">Dažų nerasta</p>';
        return;
    }

    const table = `
        <table class="paints-table" style="width: 100%; border-collapse: collapse; background: #1a1d23; border-radius: 8px; overflow: hidden;">
            <thead style="background: linear-gradient(135deg, #1a1d23 0%, #0f1115 100%); border-bottom: 2px solid #FC9D17;">
                <tr>
                    <th style="padding: 15px; text-align: left; color: #FC9D17; font-weight: 600; text-transform: uppercase;">ML Kodas</th>
                    <th style="padding: 15px; text-align: left; color: #FC9D17; font-weight: 600; text-transform: uppercase;">Gamintojas</th>
                    <th style="padding: 15px; text-align: left; color: #FC9D17; font-weight: 600; text-transform: uppercase;">Kodas</th>
                    <th style="padding: 15px; text-align: left; color: #FC9D17; font-weight: 600; text-transform: uppercase;">Spalva</th>
                    <th style="padding: 15px; text-align: left; color: #FC9D17; font-weight: 600; text-transform: uppercase;">Paviršius</th>
                    <th style="padding: 15px; text-align: left; color: #FC9D17; font-weight: 600; text-transform: uppercase;">Kiekis</th>
                    <th style="padding: 15px; text-align: left; color: #FC9D17; font-weight: 600; text-transform: uppercase;">Veiksmai</th>
                </tr>
            </thead>
            <tbody>
                ${paints.map((paint, index) => `
                    <tr style="background: ${index % 2 === 0 ? '#1a1d23' : '#0f1115'}; border-bottom: 1px solid #2d3238; transition: background 0.2s;" onmouseover="this.style.background='#242830'" onmouseout="this.style.background='${index % 2 === 0 ? '#1a1d23' : '#0f1115'}'">
                        <td style="padding: 15px; color: #e5e7eb; font-weight: 600;">${paint.ml_kodas || '-'}</td>
                        <td style="padding: 15px; color: #e5e7eb;">${paint.gamintojas || '-'}</td>
                        <td style="padding: 15px; color: #e5e7eb;">${paint.kodas || '-'}</td>
                        <td style="padding: 15px; color: #e5e7eb;">${paint.spalva || '-'}</td>
                        <td style="padding: 15px; color: #e5e7eb;">${paint.pavirsus || '-'}</td>
                        <td style="padding: 15px; color: #3ba560; font-weight: 700; font-size: 16px;">${paint.kiekis || 0} kg</td>
                        <td style="padding: 15px;">
                            <div style="display: flex; gap: 8px;">
                                <button onclick="openWeightModal('${paint.ml_kodas}', ${paint.kiekis})" class="btn-small btn-primary" style="padding: 6px 12px; font-size: 13px; border-radius: 6px;">Keisti Kiekį</button>
                                <button onclick="openPaintModal('edit', '${paint.ml_kodas}')" class="btn-small btn-secondary" style="padding: 6px 12px; font-size: 13px; border-radius: 6px;">Redaguoti</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    content.innerHTML = table;
}

// Filter paints by search term
function filterPaints(searchTerm) {
    if (!searchTerm.trim()) {
        renderPaints(allPaints);
        return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = allPaints.filter(paint =>
        (paint.ml_kodas || '').toLowerCase().includes(term) ||
        (paint.gamintojas || '').toLowerCase().includes(term) ||
        (paint.spalva || '').toLowerCase().includes(term) ||
        (paint.kodas || '').toLowerCase().includes(term)
    );

    renderPaints(filtered);
}

// Open paint modal (add or edit mode)
function openPaintModal(mode, mlKodas = null) {
    const modal = document.getElementById('paint-modal');
    const title = document.getElementById('paint-modal-title');
    const form = document.getElementById('paint-form');
    const editMode = document.getElementById('paint-edit-mode');

    if (!modal || !title || !form) return;

    // Reset form
    form.reset();
    editMode.value = mode;

    if (mode === 'add') {
        title.textContent = 'Pridėti Naujus Dažus';
        document.getElementById('paint-ml-code').readOnly = false;
    } else if (mode === 'edit') {
        title.textContent = 'Redaguoti Dažus';
        const paint = allPaints.find(p => p.ml_kodas === mlKodas);
        if (paint) {
            document.getElementById('paint-ml-code').value = paint.ml_kodas;
            document.getElementById('paint-ml-code').readOnly = true;
            document.getElementById('paint-manufacturer').value = paint.gamintojas || '';
            document.getElementById('paint-code').value = paint.kodas || '';
            document.getElementById('paint-color').value = paint.spalva || '';
            document.getElementById('paint-surface').value = paint.pavirsus || '';
            document.getElementById('paint-gloss').value = paint.blizgumas || '';
            document.getElementById('paint-effect').value = paint.effect || '';
            document.getElementById('paint-composition').value = paint.sudetis || '';
            document.getElementById('paint-primer').value = paint.gruntas || '';
            document.getElementById('paint-quantity').value = paint.kiekis || '';
            document.getElementById('paint-price').value = paint.kaina || '';
        }
    }

    modal.style.display = 'block';
}

// Open weight modal
function openWeightModal(mlKodas, currentWeight) {
    const modal = document.getElementById('weight-modal');
    if (!modal) return;

    document.getElementById('weight-ml-code').value = mlKodas;
    document.getElementById('weight-display-ml-code').textContent = mlKodas;
    document.getElementById('weight-current').textContent = `${currentWeight} kg`;
    document.getElementById('weight-new').value = '';

    modal.style.display = 'block';
}

// Close all modals
function closeModals() {
    document.getElementById('paint-modal').style.display = 'none';
    document.getElementById('weight-modal').style.display = 'none';
}

// Save paint (add or update)
async function savePaint() {
    const mode = document.getElementById('paint-edit-mode').value;
    const mlKodas = document.getElementById('paint-ml-code').value.trim();
    const gamintojas = document.getElementById('paint-manufacturer').value;
    const kodas = document.getElementById('paint-code').value.trim();
    const spalva = document.getElementById('paint-color').value.trim();
    const pavirsus = document.getElementById('paint-surface').value;
    const blizgumas = document.getElementById('paint-gloss').value;
    const effect = document.getElementById('paint-effect').value;
    const sudetis = document.getElementById('paint-composition').value;
    const gruntas = document.getElementById('paint-primer').value;
    const kiekis = parseFloat(document.getElementById('paint-quantity').value);
    const kaina = parseFloat(document.getElementById('paint-price').value) || null;

    // Validate ML code format
    if (!/^ML\d+$/.test(mlKodas)) {
        alert('Neteisingas ML kodo formatas. Turi būti ML + skaičius (pvz., ML241)');
        return;
    }

    const paintData = {
        ml_kodas: mlKodas,
        gamintojas,
        kodas,
        spalva,
        pavirsus,
        blizgumas,
        effect,
        sudetis,
        gruntas: gruntas || null,
        kiekis,
        kaina
    };

    try {
        let response;

        if (mode === 'add') {
            response = await fetch(`${EDGE_FUNCTIONS_URL}/add-paint`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionToken}`
                },
                body: JSON.stringify(paintData)
            });
        } else {
            response = await fetch(`${EDGE_FUNCTIONS_URL}/update-paint`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionToken}`
                },
                body: JSON.stringify(paintData)
            });
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to save paint');
        }

        alert(data.message);
        closeModals();
        loadPaints();

    } catch (error) {
        console.error('Error saving paint:', error);
        alert(`Klaida išsaugant dažus: ${error.message}`);
    }
}

// Save weight
async function saveWeight() {
    const mlKodas = document.getElementById('weight-ml-code').value;
    const newWeight = parseFloat(document.getElementById('weight-new').value);

    if (isNaN(newWeight) || newWeight < 0) {
        alert('Įveskite teisingą kiekį');
        return;
    }

    try {
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/update-paint-weight`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({
                ml_kodas: mlKodas,
                new_weight: newWeight
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update weight');
        }

        alert(data.message);
        closeModals();
        loadPaints();

    } catch (error) {
        console.error('Error updating weight:', error);
        alert(`Klaida atnaujinant kiekį: ${error.message}`);
    }
}
