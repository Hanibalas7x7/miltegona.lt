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
                    <th onclick="sortTable('ml_kodas')" style="cursor: pointer;">ML Kodas</th>
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
    searchTerm = searchTerm.toLowerCase().trim();
    
    if (!searchTerm) {
        // If search is empty, show all original paints
        displayPaints(allPaintsOriginal);
        return;
    }
    
    const filtered = allPaintsOriginal.filter(paint => {
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
    });
    
    displayPaints(filtered);
}

function openModal() {
    const modal = document.getElementById('add-paint-modal');
    if (modal) {
        // Calculate next available ML code
        const nextMLCode = getNextAvailableMLCode();
        document.querySelector('#add-paint-form [name="ml_code"]').value = nextMLCode;
        
        // Set default RAL value
        document.querySelector('#add-paint-form [name="spalva"]').value = 'RAL';
        
        modal.classList.add('active');
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
        ml_code: formData.get('ml_code'),
        gamintojas: formData.get('gamintojas'),
        kodas: formData.get('kodas') || null,
        spalva: formData.get('spalva') || null,
        kiekis: parseFloat(formData.get('kiekis')),
        gruntas: formData.get('gruntas') || null,
        blizgumas: formData.get('blizgumas') || null,
        pavirsus: formData.get('pavirsus') || null,
        effect: formData.get('effect') || null,
        sudetis: formData.get('sudetis') || null,
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
    const weightData = {
        id: parseInt(formData.get('id')),
        new_weight: parseFloat(formData.get('new_weight'))
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


