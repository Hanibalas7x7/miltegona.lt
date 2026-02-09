// Simple Paint Management - Step by step implementation
// Uses EDGE_FUNCTIONS_URL from darbuotojai.js (already declared globally)

// Initialize paint management when paints tab is shown
document.addEventListener('DOMContentLoaded', () => {
    console.log('Paint management script loaded');
    
    // Listen for paints tab click
    const paintsTab = document.querySelector('[data-tab="paints"]');
    if (paintsTab) {
        paintsTab.addEventListener('click', () => {
            console.log('Paints tab clicked');
            loadPaints();
        });
    }
    
    // Add paint button
    const addPaintBtn = document.getElementById('add-paint-btn');
    if (addPaintBtn) {
        addPaintBtn.addEventListener('click', () => {
            console.log('Add paint clicked');
            openModal();
        });
    }
    
    // Search input
    const searchInput = document.getElementById('paint-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterPaints(e.target.value);
        });
    }
    
    // Add paint form submit
    const addPaintForm = document.getElementById('add-paint-form');
    if (addPaintForm) {
        addPaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await savePaint(e.target);
        });
    }
    
    // Edit paint form submit
    const editPaintForm = document.getElementById('edit-paint-form');
    if (editPaintForm) {
        editPaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveEditPaint(e.target);
        });
    }
    
    // Update weight form submit
    const updateWeightForm = document.getElementById('update-weight-form');
    if (updateWeightForm) {
        updateWeightForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveWeight(e.target);
        });
    }
    
    // Auto-fill setup - listen to Gamintojas and Kodas inputs
    const gamintojasInput = document.querySelector('#add-paint-form [name="gamintojas"]');
    const kodasInput = document.querySelector('#add-paint-form [name="kodas"]');
    
    if (gamintojasInput) {
        gamintojasInput.addEventListener('input', () => {
            autoFillFields(gamintojasInput.value, kodasInput ? kodasInput.value : '');
        });
    }
    
    if (kodasInput) {
        kodasInput.addEventListener('input', () => {
            autoFillFields(gamintojasInput ? gamintojasInput.value : '', kodasInput.value);
        });
    }
    
    // Scan buttons - need explicit click handlers for mobile (label for attribute doesn't work with hidden inputs)
    const scanCameraBtn = document.getElementById('scan-camera-btn');
    const scanGalleryBtn = document.getElementById('scan-gallery-btn');
    const scanCameraInput = document.getElementById('scan-camera-input');
    const scanGalleryInput = document.getElementById('scan-gallery-input');
    
    console.log('Scan elements initialized:', { 
        scanCameraBtn: !!scanCameraBtn, 
        scanGalleryBtn: !!scanGalleryBtn,
        scanCameraInput: !!scanCameraInput, 
        scanGalleryInput: !!scanGalleryInput 
    });
    
    // Label click handlers - trigger input within user gesture context (works on mobile)
    if (scanCameraBtn && scanCameraInput) {
        scanCameraBtn.addEventListener('click', (e) => {
            console.log('[BUTTON] Camera button clicked - triggering input');
            e.preventDefault();
            e.stopPropagation();
            scanCameraInput.click();
        });
        console.log('Camera button listener attached');
    }
    
    if (scanGalleryBtn && scanGalleryInput) {
        scanGalleryBtn.addEventListener('click', (e) => {
            console.log('[BUTTON] Gallery button clicked - triggering input');
            e.preventDefault();
            e.stopPropagation();
            scanGalleryInput.click();
        });
        console.log('Gallery button listener attached');
    }
    
    // Input change handlers
    if (scanCameraInput) {
        scanCameraInput.addEventListener('change', async (e) => {
            console.log('[INPUT] Camera input change triggered, files:', e.target.files);
            const file = e.target.files[0];
            if (file) {
                console.log('[INPUT] Processing camera file:', file.name, file.size);
                await scanPaintLabel(file);
                e.target.value = ''; // Reset input
            }
        });
        console.log('Camera input listener attached');
    }
    
    if (scanGalleryInput) {
        scanGalleryInput.addEventListener('change', async (e) => {
            console.log('[INPUT] Gallery input change triggered, files:', e.target.files);
            const file = e.target.files[0];
            if (file) {
                console.log('[INPUT] Processing gallery file:', file.name, file.size);
                await scanPaintLabel(file);
                e.target.value = ''; // Reset input
            }
        });
        console.log('Gallery input listener attached');
    }
});

async function loadPaints() {
    const content = document.getElementById('paints-content');
    if (!content) return;
    
    content.innerHTML = '<p class="loading-message">Kraunama...</p>';
    
    try {
        const token = localStorage.getItem('darbuotojai_session');
        
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/get-all-paints-admin`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Paints loaded:', data);
        
        // Sort by ML code numerically (natural sort)
        const paints = (data.paints || []).sort((a, b) => {
            const aNum = parseInt(a.ml_kodas?.replace(/\D/g, '') || '0');
            const bNum = parseInt(b.ml_kodas?.replace(/\D/g, '') || '0');
            return aNum - bNum;
        });
        
        // Store original list
        allPaintsOriginal = paints;
        
        displayPaints(paints);
        
    } catch (error) {
        console.error('Error loading paints:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p style="color: #FC9D17; margin-bottom: 10px;">Klaida įkeliant dažus</p>
                <p style="color: #888; font-size: 14px;">${error.message}</p>
            </div>
        `;
    }
}

function displayPaints(paints) {
    const content = document.getElementById('paints-content');
    
    // Cache paints for edit/update functions
    allPaintsCache = paints;
    
    if (paints.length === 0) {
        content.innerHTML = '<p style="text-align: center; padding: 40px; color: #888;">Dažų sąrašas tuščias</p>';
        return;
    }
    
    const table = `
        <table class="paints-table">
            <thead>
                <tr>
                    <th onclick="sortTable('ml_kodas')" style="cursor: pointer;">ML<br>Kodas</th>
                    <th onclick="sortTable('kiekis')" style="cursor: pointer;">Svoris</th>
                    <th onclick="sortTable('gamintojas')" style="cursor: pointer;">Gamintojas</th>
                    <th onclick="sortTable('kodas')" style="cursor: pointer;">Kodas</th>
                    <th onclick="sortTable('spalva')" style="cursor: pointer;">Spalva</th>
                    <th onclick="sortTable('gruntas')" style="cursor: pointer;">Gruntas</th>
                    <th onclick="sortTable('blizgumas')" style="cursor: pointer;">Blizgumas</th>
                    <th onclick="sortTable('pavirsus')" style="cursor: pointer;">Paviršius</th>
                    <th onclick="sortTable('effect')" style="cursor: pointer;">Efektas</th>
                    <th onclick="sortTable('sudetis')" style="cursor: pointer;">Sudėtis</th>
                    <th onclick="sortTable('kaina')" style="cursor: pointer;">Kaina</th>
                    <th style="width: 80px;">Veiksmai</th>
                </tr>
            </thead>
            <tbody>
                ${paints.map(paint => `
                    <tr>
                        <td>${paint.ml_kodas || '-'}</td>
                        <td onclick="updateWeight(${paint.id})" style="cursor: pointer; color: #FC9D17; font-weight: 500;" title="Spustelėkite norėdami pakeisti svorį">${paint.kiekis ? Number(paint.kiekis).toFixed(2) : '0.00'}</td>
                        <td>${paint.gamintojas || '-'}</td>
                        <td>${paint.kodas || '-'}</td>
                        <td>${paint.spalva || '-'}</td>
                        <td>${paint.gruntas || '-'}</td>
                        <td>${paint.blizgumas || '-'}</td>
                        <td>${paint.pavirsus || '-'}</td>
                        <td>${paint.effect || '-'}</td>
                        <td>${paint.sudetis || '-'}</td>
                        <td>${paint.kaina ? Number(paint.kaina).toFixed(2) : '-'}</td>
                        <td style="white-space: nowrap;">
                            <button class="btn btn-secondary" style="padding: 4px 12px; font-size: 12px;" onclick="editPaint(${paint.id})" title="Redaguoti dažą">Redaguoti</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    content.innerHTML = table;
}

function getSortIcon(column) {
    if (currentSort.column !== column) return '↕';
    return currentSort.ascending ? '↑' : '↓';
}

function sortTable(column) {
    // Toggle direction if same column, otherwise ascending
    if (currentSort.column === column) {
        currentSort.ascending = !currentSort.ascending;
    } else {
        currentSort.column = column;
        currentSort.ascending = true;
    }
    
    const sorted = [...allPaintsCache].sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        // Handle ML kodas numerically
        if (column === 'ml_kodas') {
            const aNum = parseInt(aVal?.replace(/\D/g, '') || '0');
            const bNum = parseInt(bVal?.replace(/\D/g, '') || '0');
            return currentSort.ascending ? aNum - bNum : bNum - aNum;
        }
        
        // Handle numeric columns
        if (column === 'kiekis' || column === 'kaina') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
            return currentSort.ascending ? aVal - bVal : bVal - aVal;
        }
        
        // Handle text columns
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
        
        if (aVal < bVal) return currentSort.ascending ? -1 : 1;
        if (aVal > bVal) return currentSort.ascending ? 1 : -1;
        return 0;
    });
    
    displayPaints(sorted);
}

window.sortTable = sortTable;

function filterPaints(searchTerm) {
    const originalSearchTerm = searchTerm;
    searchTerm = searchTerm.toLowerCase().trim();
    
    if (!searchTerm) {
        // If search is empty, show all original paints
        displayPaints(allPaintsOriginal);
        return;
    }
    
    // Check if original search term ends with space - exact ML code search
    const exactMLSearch = originalSearchTerm.endsWith(' ');
    
    const filtered = allPaintsOriginal.filter(paint => {
        if (exactMLSearch) {
            // Exact ML code match only (without space)
            const cleanSearchTerm = searchTerm; // already trimmed
            return paint.ml_kodas && paint.ml_kodas.toLowerCase() === `ml${cleanSearchTerm}`;
        } else {
            // Normal search across all fields
            return (
                (paint.ml_kodas && paint.ml_kodas.toLowerCase().includes(searchTerm)) ||
                (paint.gamintojas && paint.gamintojas.toLowerCase().includes(searchTerm)) ||
                (paint.kodas && paint.kodas.toLowerCase().includes(searchTerm)) ||
                (paint.spalva && paint.spalva.toLowerCase().includes(searchTerm)) ||
                (paint.gruntas && paint.gruntas.toLowerCase().includes(searchTerm)) ||
                (paint.blizgumas && paint.blizgumas.toLowerCase().includes(searchTerm)) ||
                (paint.pavirsus && paint.pavirsus.toLowerCase().includes(searchTerm)) ||
                (paint.effect && paint.effect.toLowerCase().includes(searchTerm)) ||
                (paint.sudetis && paint.sudetis.toLowerCase().includes(searchTerm))
            );
        }
    });
    
    displayPaints(filtered);
}

function openModal() {
    console.log('[MODAL] openModal() called');
    const modal = document.getElementById('add-paint-modal');
    if (modal) {
        console.log('[MODAL] Modal element found');
        // Calculate next available ML code
        const nextMLCode = getNextAvailableMLCode();
        document.querySelector('#add-paint-form [name="ml_code"]').value = nextMLCode;
        
        // Set default RAL value
        document.querySelector('#add-paint-form [name="spalva"]').value = 'RAL';
        
        modal.classList.add('active');
        console.log('[MODAL] Modal activated');
        
        // Scroll modal content to top
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    }
}

function getNextAvailableMLCode() {
    // Get all ML codes and extract numbers
    const mlNumbers = allPaintsOriginal
        .map(p => {
            const match = p.ml_kodas?.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
        })
        .filter(num => num > 0)
        .sort((a, b) => a - b);
    
    if (mlNumbers.length === 0) {
        return 'ML1';
    }
    
    // Find first missing number
    for (let i = 1; i <= mlNumbers[mlNumbers.length - 1]; i++) {
        if (!mlNumbers.includes(i)) {
            return `ML${i}`;
        }
    }
    
    // If no gaps, return next number
    return `ML${mlNumbers[mlNumbers.length - 1] + 1}`;
}

function closeModal() {
    const modal = document.getElementById('add-paint-modal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('add-paint-form').reset();
    }
}

async function savePaint(form) {
    const formData = new FormData(form);
    const paintData = {
        ml_kodas: formData.get('ml_code'),
        gamintojas: formData.get('gamintojas'),
        kodas: formData.get('kodas') || '',
        spalva: formData.get('spalva') || '',
        kiekis: parseFloat(formData.get('kiekis')),
        gruntas: formData.get('gruntas') || null,
        blizgumas: formData.get('blizgumas') || '',
        pavirsus: formData.get('pavirsus') || '',
        effect: formData.get('effect') || '',
        sudetis: formData.get('sudetis') || '',
        kaina: formData.get('kaina') ? parseFloat(formData.get('kaina')) : null
    };
    
    try {
        const token = localStorage.getItem('darbuotojai_session');
        
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/add-paint`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paintData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Klaida išsaugant dažą');
        }
        
        alert('Dažas sėkmingai pridėtas!');
        closeModal();
        loadPaints();
        
    } catch (error) {
        console.error('Error saving paint:', error);
        alert('Klaida: ' + error.message);
    }
}

// Make closeModal available globally for onclick in HTML
window.closeModal = closeModal;

let allPaintsCache = [];
let allPaintsOriginal = []; // Keep original unfiltered list
let currentSort = { column: null, ascending: true };

window.editPaint = function(id) {
    const paint = allPaintsCache.find(p => p.id === id);
    if (!paint) {
        alert('Dažas nerastas');
        return;
    }
    
    // Fill form
    document.getElementById('edit-paint-id').value = paint.id;
    document.querySelector('#edit-paint-form [name="ml_code"]').value = paint.ml_kodas || '';
    document.querySelector('#edit-paint-form [name="gamintojas"]').value = paint.gamintojas || '';
    document.querySelector('#edit-paint-form [name="kodas"]').value = paint.kodas || '';
    document.querySelector('#edit-paint-form [name="spalva"]').value = paint.spalva || '';
    document.querySelector('#edit-paint-form [name="gruntas"]').value = paint.gruntas || '';
    document.querySelector('#edit-paint-form [name="blizgumas"]').value = paint.blizgumas || '';
    document.querySelector('#edit-paint-form [name="pavirsus"]').value = paint.pavirsus || '';
    document.querySelector('#edit-paint-form [name="effect"]').value = paint.effect || '';
    document.querySelector('#edit-paint-form [name="sudetis"]').value = paint.sudetis || '';
    document.querySelector('#edit-paint-form [name="kaina"]').value = paint.kaina || '';
    
    // Open modal
    document.getElementById('edit-paint-modal').classList.add('active');
};

window.updateWeight = function(id) {
    const paint = allPaintsCache.find(p => p.id === id);
    if (!paint) {
        alert('Dažas nerastas');
        return;
    }
    
    // Fill form
    document.getElementById('weight-paint-id').value = paint.id;
    document.getElementById('weight-ml-code').value = paint.ml_kodas || '';
    document.getElementById('weight-gamintojas').value = paint.gamintojas || '';
    document.getElementById('weight-current').textContent = paint.kiekis ? Number(paint.kiekis).toFixed(2) : '0.00';
    
    // Open modal
    document.getElementById('weight-modal').classList.add('active');
};

function closeEditModal() {
    document.getElementById('edit-paint-modal').classList.remove('active');
    document.getElementById('edit-paint-form').reset();
}

function closeWeightModal() {
    document.getElementById('weight-modal').classList.remove('active');
    document.getElementById('update-weight-form').reset();
}

window.closeEditModal = closeEditModal;
window.closeWeightModal = closeWeightModal;

async function saveEditPaint(form) {
    const formData = new FormData(form);
    const paintData = {
        id: parseInt(formData.get('id')),
        gamintojas: formData.get('gamintojas'),
        kodas: formData.get('kodas') || null,
        spalva: formData.get('spalva') || null,
        gruntas: formData.get('gruntas') || null,
        blizgumas: formData.get('blizgumas') || null,
        pavirsus: formData.get('pavirsus') || null,
        effect: formData.get('effect') || null,
        sudetis: formData.get('sudetis') || null,
        kaina: formData.get('kaina') ? parseFloat(formData.get('kaina')) : null
    };
    
    try {
        const token = localStorage.getItem('darbuotojai_session');
        
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/update-paint`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paintData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Klaida išsaugant dažą');
        }
        
        alert('Dažas sėkmingai atnaujintas!');
        closeEditModal();
        loadPaints();
        
    } catch (error) {
        console.error('Error updating paint:', error);
        alert('Klaida: ' + error.message);
    }
}

async function saveWeight(form) {
    const formData = new FormData(form);
    const id = parseInt(formData.get('id'));
    const new_weight = parseFloat(formData.get('new_weight'));
    
    // Find paint by ID to get ml_kodas
    const paint = allPaintsCache.find(p => p.id === id);
    if (!paint || !paint.ml_kodas) {
        alert('Klaida: ML kodas nerastas');
        return;
    }
    
    const weightData = {
        ml_kodas: paint.ml_kodas,
        new_weight: new_weight
    };
    
    try {
        const token = localStorage.getItem('darbuotojai_session');
        
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/update-paint-weight`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(weightData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Klaida atnaujinant svorį');
        }
        
        alert('Svoris sėkmingai atnaujintas!');
        closeWeightModal();
        loadPaints();
        
    } catch (error) {
        console.error('Error updating weight:', error);
        alert('Klaida: ' + error.message);
    }
}

// Auto-fill function based on manufacturer and code (from Miltegona_Manager logic)
function autoFillFields(manufacturer, code) {
    if (!manufacturer || !code) return;
    
    const form = document.getElementById('add-paint-form');
    if (!form) return;
    
    const spalvaInput = form.querySelector('[name="spalva"]');
    const blizgumasInput = form.querySelector('[name="blizgumas"]');
    const pavirsusInput = form.querySelector('[name="pavirsus"]');
    const effectSelect = form.querySelector('[name="effect"]');
    const sudetisSelect = form.querySelector('[name="sudetis"]');
    const gruntasSelect = form.querySelector('[name="gruntas"]');
    
    // Auto-fill Spalva (Color)
    let color = '';
    if (manufacturer === 'Ripol') {
        const mid6to4 = code.length >= 9 ? code.substring(5, 9) : '';
        if (mid6to4 === 'C290') {
            color = 'Primer Zinc';
        } else if (mid6to4 === 'G535') {
            color = 'Star Gold';
        } else {
            color = 'RAL' + mid6to4;
        }
    } else if (manufacturer === 'EuroPolveri') {
        if (code.length >= 8) {
            const mid5to1 = code.substring(4, 5);
            const mid7to2 = code.length >= 8 ? code.substring(6, 8) : '';
            color = 'RAL' + mid5to1 + '0' + mid7to2;
        }
    }
    
    // Auto-fill Gruntas (Primer)
    let gruntas = '';
    if (manufacturer === 'EuroPolveri') {
        if (code.length >= 13) {
            const mid13to1 = code.substring(12, 13);
            if (mid13to1 === '2') {
                gruntas = 'X';
            }
        }
    } else if (manufacturer === 'EkoColor') {
        if (code.length >= 17) {
            const mid16to2 = code.substring(15, 17);
            if (mid16to2 === 'NT') {
                gruntas = 'X';
            } else if (mid16to2 === 'ZP') {
                gruntas = 'Zn';
            }
        }
    }
    
    // Auto-fill Blizgumas (Gloss)
    let gloss = '';
    if (manufacturer === 'Ripol') {
        if (code.length >= 2) {
            const mid2to1 = code.substring(1, 2);
            if (['1', '2'].includes(mid2to1)) {
                gloss = 'Matt';
            } else if (['3', '4'].includes(mid2to1)) {
                gloss = 'SemiMatt';
            } else if (['5', '6'].includes(mid2to1)) {
                gloss = 'SemiGlossy';
            } else if (['7', '8'].includes(mid2to1)) {
                gloss = 'Glossy';
            } else if (mid2to1 === '9') {
                gloss = 'High Gloss';
            }
        }
    } else if (manufacturer === 'EuroPolveri') {
        if (code.length >= 3) {
            const mid3to1 = code.substring(2, 3);
            if (mid3to1 === '1') {
                gloss = 'Glossy 90';
            } else if (mid3to1 === '2') {
                gloss = 'SemiGlossy 75';
            } else if (mid3to1 === '3') {
                gloss = 'SemiMatt 60';
            } else if (mid3to1 === '4') {
                gloss = 'Matt 25';
            } else if (mid3to1 === '5') {
                gloss = 'Ultra Matt 15';
            }
        }
    } else if (manufacturer === 'EkoColor') {
        if (code.length >= 5) {
            const mid5to1 = code.substring(4, 5);
            if (mid5to1 === '1') {
                gloss = 'High Gloss';
            } else if (mid5to1 === '2') {
                gloss = 'SemiGlossy';
            } else if (mid5to1 === '3') {
                gloss = 'SemiMatt';
            } else if (mid5to1 === '4') {
                gloss = 'Matt';
            } else if (mid5to1 === '5') {
                gloss = 'Ultra Matt';
            }
        }
    }
    
    // Auto-fill Paviršius (Surface)
    let surface = '';
    if (manufacturer === 'Ripol') {
        if (code.length >= 3) {
            const mid3to1 = code.substring(2, 3);
            if (mid3to1 === 'A') {
                surface = 'Antiques';
            } else if (mid3to1 === 'M') {
                surface = 'Hammered';
            } else if (mid3to1 === 'R') {
                surface = 'Smėlis';
            } else if (mid3to1 === 'B') {
                surface = 'Apelsinas';
            } else if (mid3to1 === 'L') {
                surface = 'Smooth';
            }
        }
    } else if (manufacturer === 'EuroPolveri') {
        if (code.length >= 2) {
            const mid2to1 = code.substring(1, 2);
            if (mid2to1 === 'L') {
                surface = 'Smooth';
            } else if (mid2to1 === 'B') {
                surface = 'Apelsinas';
            } else if (mid2to1 === 'R') {
                surface = 'Smėlis';
            }
        }
    } else if (manufacturer === 'EkoColor') {
        if (code.length >= 4) {
            const mid4to1 = code.substring(3, 4);
            if (mid4to1 === '1') {
                surface = 'Smooth';
            } else if (mid4to1 === '4') {
                surface = 'Apelsinas';
            } else if (mid4to1 === '2') {
                surface = 'Smėlis';
            }
        }
    }
    
    // Auto-fill Effect
    let effect = '';
    if (manufacturer === 'Ripol') {
        if (code.length >= 5) {
            const mid5to1 = code.substring(4, 5);
            if (mid5to1 === '1') {
                effect = 'Normal';
            } else if (mid5to1 === '2') {
                effect = 'Metallic';
            } else if (mid5to1 === '3') {
                effect = 'Clear';
            } else if (mid5to1 === '4') {
                effect = 'Clear Met';
            }
        }
        if (code.length >= 3) {
            const mid3to1 = code.substring(2, 3);
            if (mid3to1 === '5') {
                effect = 'Marble';
            } else if (mid3to1 === '6') {
                effect = 'Marble Met';
            } else if (mid3to1 === '7') {
                effect = 'Bonded';
            }
        }
    } else if (manufacturer === 'EuroPolveri') {
        if (code.length >= 11) {
            const mid11to1 = code.substring(10, 11);
            if (mid11to1 !== '0') {
                effect = 'Metallic';
            }
        }
    } else if (manufacturer === 'EkoColor') {
        if (code.length >= 17) {
            const mid16to2 = code.substring(15, 17);
            if (mid16to2 === 'FX') {
                effect = 'Metallic';
            }
        }
        if (code.length >= 16) {
            const mid16to1 = code.substring(15, 16);
            if (mid16to1 === 'C') {
                effect = 'Cinkui';
            }
        }
    }
    
    // Auto-fill Sudėtis (Composition)
    let composition = '';
    if (manufacturer === 'Ripol') {
        if (code.length > 0) {
            const left1 = code.substring(0, 1);
            if (left1 === '1') {
                composition = 'Hybrid PE';
            } else if (left1 === '2') {
                composition = 'Epoxy';
            } else if (left1 === '5') {
                composition = 'Polyester';
            } else if (left1 === '6') {
                composition = 'Industrial PE';
            }
        }
    } else if (manufacturer === 'EuroPolveri') {
        if (code.length > 0) {
            const left1 = code.substring(0, 1);
            if (left1 === '1') {
                composition = 'Industrial PE';
            } else if (left1 === '5') {
                composition = 'Polyester';
            } else if (left1 === '6') {
                composition = 'Epoxy';
            } else if (left1 === '7') {
                composition = 'Industrial PE';
            } else if (left1 === '9') {
                composition = 'Hybrid PE';
            }
        }
    } else if (manufacturer === 'EkoColor') {
        if (code.length >= 2) {
            const left2 = code.substring(0, 2);
            if (left2 === 'PF') {
                composition = 'Industrial PE';
            } else if (left2 === 'PA') {
                composition = 'Polyester';
            } else if (left2 === 'EE') {
                composition = 'Epoxy';
            } else if (left2 === 'EP') {
                composition = 'Hybrid PE';
            }
        }
    }
    
    // Update form fields (only if field is empty or has default value)
    if (spalvaInput && (spalvaInput.value === '' || spalvaInput.value === 'RAL')) {
        spalvaInput.value = color || 'RAL';
    }
    if (blizgumasInput) {
        blizgumasInput.value = gloss;
    }
    if (pavirsusInput) {
        pavirsusInput.value = surface;
    }
    if (effectSelect) {
        effectSelect.value = effect;
    }
    if (sudetisSelect) {
        sudetisSelect.value = composition || 'Polyester';
    }
    if (gruntasSelect) {
        gruntasSelect.value = gruntas;
    }
}

// Scan paint label using Edge Function
async function scanPaintLabel(imageFile) {
    console.log('[SCAN] ========== SCAN START ==========');
    console.log('[SCAN] scanPaintLabel() called with file:', imageFile ? imageFile.name : 'NO FILE');
    console.log('[SCAN] File details:', { name: imageFile?.name, size: imageFile?.size, type: imageFile?.type });
    try {
        // Show loading state on both buttons
        const scanCameraBtn = document.getElementById('scan-camera-btn');
        const scanGalleryBtn = document.getElementById('scan-gallery-btn');
        console.log('[SCAN] Button elements:', { camera: !!scanCameraBtn, gallery: !!scanGalleryBtn });
        const originalCameraHTML = scanCameraBtn ? scanCameraBtn.innerHTML : '';
        const originalGalleryHTML = scanGalleryBtn ? scanGalleryBtn.innerHTML : '';
        
        if (scanCameraBtn) {
            scanCameraBtn.disabled = true;
            scanCameraBtn.innerHTML = `
                <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle;">
                    <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" opacity="0.25"></circle>
                    <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" stroke-dasharray="63" stroke-dashoffset="16" opacity="1">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                    </circle>
                </svg>
            `;
        }
        
        if (scanGalleryBtn) {
            scanGalleryBtn.disabled = true;
            scanGalleryBtn.innerHTML = `
                <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle;">
                    <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" opacity="0.25"></circle>
                    <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" stroke-dasharray="63" stroke-dashoffset="16" opacity="1">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                    </circle>
                </svg>
            `;
        }

        // Convert image to base64
        console.log('[SCAN] Converting file to base64...');
        const base64Image = await fileToBase64(imageFile);
        console.log('[SCAN] Base64 conversion complete, length:', base64Image.length);

        // Call Edge Function
        const token = localStorage.getItem('darbuotojai_session');
        console.log('[SCAN] Calling Edge Function:', `${EDGE_FUNCTIONS_URL}/scan-paint-label`);
        const response = await fetch(`${EDGE_FUNCTIONS_URL}/scan-paint-label`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ image_base64: base64Image }),
        });

        console.log('[SCAN] API response received, status:', response.status);
        const data = await response.json();
        console.log('[SCAN] Response data:', JSON.stringify(data, null, 2));

        // Restore buttons
        if (scanCameraBtn) {
            scanCameraBtn.disabled = false;
            scanCameraBtn.innerHTML = originalCameraHTML;
        }
        if (scanGalleryBtn) {
            scanGalleryBtn.disabled = false;
            scanGalleryBtn.innerHTML = originalGalleryHTML;
        }
        console.log('[SCAN] Buttons restored');

        if (!response.ok || !data.success) {
            console.error('[SCAN] API error:', data.error);
            alert(`❌ Klaida skenuojant: ${data.error || 'Nežinoma klaida'}`);
            console.error('Scan error:', data);
            return;
        }

        console.log('[SCAN] Scan successful, results:', data);

        // Fill form fields with extracted data (modal already open)
        const form = document.getElementById('add-paint-form');
        if (!form) {
            console.error('[SCAN] ERROR: Add paint form not found!');
            alert('⚠️ Klaida: forma nerasta. Atverkite "Pridėti Naujus Dažus" langą ir bandykite dar kartą.');
            return;
        }
        console.log('[SCAN] Form found, filling fields...');

        // Fill manufacturer
        if (data.manufacturer) {
            const gamintojasInput = form.querySelector('[name="gamintojas"]');
            if (gamintojasInput) {
                gamintojasInput.value = data.manufacturer;
                gamintojasInput.dispatchEvent(new Event('input', { bubbles: true }));
                gamintojasInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
        
        // Fill product code
        if (data.product_code) {
            const kodasInput = form.querySelector('[name="kodas"]');
            if (kodasInput) {
                kodasInput.value = data.product_code;
                kodasInput.dispatchEvent(new Event('input', { bubbles: true }));
                kodasInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
        
        // Fill RAL/color code
        if (data.ral_code) {
            const spalvaInput = form.querySelector('[name="spalva"]');
            if (spalvaInput) {
                spalvaInput.value = data.ral_code;
                spalvaInput.dispatchEvent(new Event('input', { bubbles: true }));
                spalvaInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
        
        // Fill weight
        if (data.weight_kg) {
            const kiekisInput = form.querySelector('[name="kiekis"]');
            if (kiekisInput) {
                kiekisInput.value = data.weight_kg;
                kiekisInput.dispatchEvent(new Event('input', { bubbles: true }));
                kiekisInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
        
        // Fill gloss
        if (data.gloss) {
            const blizgumasInput = form.querySelector('[name="blizgumas"]');
            if (blizgumasInput) {
                blizgumasInput.value = data.gloss;
                blizgumasInput.dispatchEvent(new Event('input', { bubbles: true }));
                blizgumasInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
        
        // Fill surface
        if (data.surface) {
            const pavirsusInput = form.querySelector('[name="pavirsus"]');
            if (pavirsusInput) {
                pavirsusInput.value = data.surface;
                pavirsusInput.dispatchEvent(new Event('input', { bubbles: true }));
                pavirsusInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
        
        // Fill paint type/composition
        if (data.paint_type) {
            const sudetisSelect = form.querySelector('[name="sudetis"]');
            if (sudetisSelect) {
                sudetisSelect.value = data.paint_type;
                sudetisSelect.dispatchEvent(new Event('input', { bubbles: true }));
                sudetisSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // Show success message with extracted data in styled modal
        const extractedData = [];
        if (data.manufacturer) extractedData.push({ icon: 'building', label: 'Gamintojas', value: data.manufacturer });
        if (data.product_code) extractedData.push({ icon: 'hash', label: 'Produkto kodas', value: data.product_code });
        if (data.ral_code) extractedData.push({ icon: 'droplet', label: 'RAL/Spalva', value: data.ral_code });
        if (data.weight_kg) extractedData.push({ icon: 'weight', label: 'Svoris', value: `${data.weight_kg} kg` });
        if (data.gloss) extractedData.push({ icon: 'sun', label: 'Blizgumas', value: data.gloss });
        if (data.surface) extractedData.push({ icon: 'layers', label: 'Paviršius', value: data.surface });
        if (data.paint_type) extractedData.push({ icon: 'package', label: 'Sudėtis', value: data.paint_type });

        if (extractedData.length > 0) {
            console.log('[SCAN] Showing scan results modal, data count:', extractedData.length);
            showScanResults(extractedData);
        } else {
            console.warn('[SCAN] No data extracted from label');
            alert('⚠️ Lipduko duomenys nuskaityti, bet nepavyko atpažinti specifinių laukų. Bandykite su aiškesne nuotrauka.');
        }
        console.log('[SCAN] ========== SCAN COMPLETE ==========');

    } catch (error) {
        console.error('[SCAN] ERROR:', error);
        const scanCameraBtn = document.getElementById('scan-camera-btn');
        const scanGalleryBtn = document.getElementById('scan-gallery-btn');
        
        if (scanCameraBtn) {
            scanCameraBtn.disabled = false;
            scanCameraBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                </svg>
            `;
        }
        
        if (scanGalleryBtn) {
            scanGalleryBtn.disabled = false;
            scanGalleryBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
            `;
        }
        
        alert(`❌ Klaida skenuojant lipduko: ${error.message}`);
    }
}

// Convert File to base64 string (without data URI prefix)
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URI prefix (e.g., "data:image/jpeg;base64,")
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Show scan results in styled modal
function showScanResults(extractedData) {
    console.log('[RESULTS] showScanResults() called with', extractedData.length, 'items');
    const modal = document.getElementById('scan-results-modal');
    const resultsList = document.getElementById('scan-results-list');
    console.log('[RESULTS] Modal elements:', { modal: !!modal, resultsList: !!resultsList });
    
    // Icon SVG paths for each type
    const icons = {
        building: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01"/>',
        hash: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
        droplet: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
        weight: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
        layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
        package: '<path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'
    };
    
    // Clear previous results
    resultsList.innerHTML = '';
    
    // Add each result item
    extractedData.forEach(item => {
        const resultItem = document.createElement('div');
        resultItem.className = 'scan-result-item';
        resultItem.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${icons[item.icon] || icons.package}
            </svg>
            <div class="scan-result-text">
                <div class="scan-result-label">${item.label}</div>
                <div class="scan-result-value" title="${item.value}">${item.value}</div>
            </div>
        `;
        resultsList.appendChild(resultItem);
    });
    
    console.log('[RESULTS] Results list populated with', extractedData.length, 'items');
    
    // Show modal
    console.log('[RESULTS] Activating modal...');
    modal.classList.add('active');
    console.log('[RESULTS] Modal activated, classList:', modal.classList.toString());
}

function closeScanResultsModal() {
    const modal = document.getElementById('scan-results-modal');
    modal.classList.remove('active');
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('scan-results-modal');
    if (modal && e.target === modal) {
        closeScanResultsModal();
    }
});
