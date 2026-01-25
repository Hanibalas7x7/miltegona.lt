// Price Calculator
document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculate-btn');
    const totalPriceEl = document.getElementById('total-price');
    const priceBreakdownEl = document.getElementById('price-breakdown');
    const quoteRequestBtn = document.getElementById('quote-request-btn');

    // Minimum order amount
    const MIN_ORDER = 15;

    // Store calculation data for quote request
    let calculationData = null;

    calculateBtn.addEventListener('click', calculatePrice);
    
    // Handle quote request button
    quoteRequestBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (calculationData) {
            sendQuoteRequest();
        } else {
            alert('Prašome pirma apskaičiuoti kainą');
        }
    });

    function calculatePrice() {
        // Get dimensions in mm
        const length = parseFloat(document.getElementById('length').value) || 0;
        const width = parseFloat(document.getElementById('width').value) || 0;
        const height = parseFloat(document.getElementById('height').value) || 0;
        const quantity = parseInt(document.getElementById('quantity').value) || 1;
        const weight = parseFloat(document.getElementById('weight').value) || 0;

        // Get surface preparation (1 = cleaning, 1.5 = sandblasting)
        const surfacePrepValue = parseFloat(document.getElementById('surface-prep').value);
        const isSandblasting = surfacePrepValue > 1;

        // Get color type value
        const colorTypeValue = parseFloat(document.getElementById('color-type').value);
        
        // Get coating checkboxes
        const primer = document.getElementById('primer').checked;
        const secondCoat = document.getElementById('second-coat').checked;
        
        // Get complexity from radio buttons
        const complexityRadio = document.querySelector('input[name="complexity"]:checked');
        const oneSideOnly = document.getElementById('one-side-only').checked;
        const complexity = oneSideOnly ? 1 : (complexityRadio ? parseFloat(complexityRadio.value) : 1);

        // Get additional services
        const maskingCount = parseInt(document.getElementById('masking').value) || 0;
        const assemblyChecked = document.getElementById('assembly').checked;
        const urgentChecked = document.getElementById('urgent').checked;

        // Validate inputs
        if (length === 0 || height === 0) {
            alert('Prašome užpildyti ilgį ir aukštį');
            return;
        }

        // Calculate depth multiplier based on width (depth)
        let depthMultiplier = 1;
        if (width > 700) {
            depthMultiplier = 2;
        } else if (width > 500) {
            depthMultiplier = 1.5;
        }

        // Calculate weight multiplier
        let weightMultiplier = 1;
        if (weight >= 200 && weight <= 1000) {
            weightMultiplier = 1.3;
        } else if (weight >= 100 && weight < 200) {
            weightMultiplier = 1.2;
        } else if (weight >= 50 && weight < 100) {
            weightMultiplier = 1.1;
        }

        // Base multiplier for all calculations (ilgis x aukštis x plačio_daugiklis x sudėtingumas x svorio_daugiklis)
        const baseMultiplier = (length / 1000) * (height / 1000) * depthMultiplier * complexity * weightMultiplier;

        // Color price per m² based on type
        let colorPrice = 8; // Dark RAL
        let colorName = 'Tamsios RAL';
        if (colorTypeValue === 1.2) {
            colorPrice = 9; // Light RAL
            colorName = 'Šviesios RAL';
        } else if (colorTypeValue === 1.3) {
            colorPrice = 10; // Metallic
            colorName = 'Metalik/perlamutras';
        } else if (colorTypeValue === 1.5) {
            colorPrice = 12; // NCS
            colorName = 'NCS';
        }

        // PAINTING PRICE: base calculation × color price
        let singleCoatPrice = baseMultiplier * colorPrice;
        let paintingPrice = singleCoatPrice;
        
        // If second coat is selected, double the painting price
        if (secondCoat) {
            paintingPrice = singleCoatPrice * 2;
        }

        // SANDBLASTING PRICE: only if sandblasting is selected
        let sandblastingPrice = 0;
        if (isSandblasting) {
            sandblastingPrice = baseMultiplier * 6;
        }

        // PRIMER PRICE: only if primer is selected
        let primerPrice = 0;
        if (primer) {
            primerPrice = baseMultiplier * 8;
        }

        // Calculate price per piece
        const pricePerPiece = paintingPrice + sandblastingPrice + primerPrice;

        // Calculate total for all pieces
        let totalPrice = pricePerPiece * quantity;

        // ADDITIONAL SERVICES
        const maskingPrice = maskingCount * 5;
        const assemblyPrice = assemblyChecked ? 20 * quantity : 0;
        const urgentPrice = urgentChecked ? 50 : 0;

        totalPrice += maskingPrice + assemblyPrice + urgentPrice;

        // Apply minimum order
        if (totalPrice < MIN_ORDER) {
            totalPrice = MIN_ORDER;
        }

        // Display results
        totalPriceEl.textContent = totalPrice.toFixed(2) + ' €';

        // Create breakdown
        let breakdownHTML = '<h4>Kainos sudėtis (1 vnt.):</h4>';
        breakdownHTML += `<div class="price-item"><span>Matmenys:</span><span>${length}×${height}×${width} mm</span></div>`;
        
        if (depthMultiplier > 1) {
            breakdownHTML += `<div class="price-item"><span>Gylio daugiklis:</span><span>×${depthMultiplier}</span></div>`;
        }
        
        if (complexity > 1) {
            breakdownHTML += `<div class="price-item"><span>Sudėtingumas:</span><span>×${complexity}</span></div>`;
        }
        
        if (weightMultiplier > 1) {
            breakdownHTML += `<div class="price-item"><span>Svoris:</span><span>${weight} kg</span></div>`;
        }
        
        breakdownHTML += '<h4 style="margin-top: 1rem;">Dažymas:</h4>';
        breakdownHTML += `<div class="price-item"><span>${colorName}:</span><span>${singleCoatPrice.toFixed(2)} €</span></div>`;
        if (secondCoat) {
            breakdownHTML += `<div class="price-item"><span>Antras sluoksnis:</span><span>${singleCoatPrice.toFixed(2)} €</span></div>`;
        }
        
        if (isSandblasting) {
            breakdownHTML += '<h4 style="margin-top: 1rem;">Smėliavimas:</h4>';
            breakdownHTML += `<div class="price-item"><span>Smėliavimas:</span><span>${sandblastingPrice.toFixed(2)} €</span></div>`;
        }
        
        if (primer) {
            breakdownHTML += '<h4 style="margin-top: 1rem;">Gruntavimas:</h4>';
            breakdownHTML += `<div class="price-item"><span>Gruntavimas:</span><span>${primerPrice.toFixed(2)} €</span></div>`;
        }

        breakdownHTML += `<div class="price-item" style="margin-top: 1rem;"><strong>Kaina už 1 vnt.:</strong><strong>${pricePerPiece.toFixed(2)} €</strong></div>`;
        breakdownHTML += `<div class="price-item"><span>Kiekis:</span><span>${quantity} vnt.</span></div>`;
        breakdownHTML += `<div class="price-item"><strong>Viso už detales:</strong><strong>${(pricePerPiece * quantity).toFixed(2)} €</strong></div>`;

        if (maskingPrice > 0 || assemblyPrice > 0 || urgentPrice > 0) {
            breakdownHTML += '<h4 style="margin-top: 1rem;">Papildomos paslaugos:</h4>';
            if (maskingPrice > 0) {
                breakdownHTML += `<div class="price-item"><span>Užmaskavimas (${maskingCount} × 5 €):</span><span>+${maskingPrice.toFixed(2)} €</span></div>`;
            }
            if (assemblyPrice > 0) {
                breakdownHTML += `<div class="price-item"><span>Surinkimas (${quantity} × 20 €):</span><span>+${assemblyPrice.toFixed(2)} €</span></div>`;
            }
            if (urgentPrice > 0) {
                breakdownHTML += `<div class="price-item"><span>Skubus užsakymas:</span><span>+${urgentPrice.toFixed(2)} €</span></div>`;
            }
        }

        if (totalPrice === MIN_ORDER) {
            breakdownHTML += `<div class="price-item" style="color: var(--primary-color); margin-top: 1rem;"><strong>Minimali užsakymo suma:</strong><strong>${MIN_ORDER} €</strong></div>`;
        }

        priceBreakdownEl.innerHTML = breakdownHTML;
        
        // Get complexity text safely
        let complexityText = '';
        if (oneSideOnly) {
            complexityText = 'Tik iš vienos pusės';
        } else if (complexityRadio) {
            const complexityCard = complexityRadio.parentElement.querySelector('.complexity-text');
            complexityText = complexityCard ? complexityCard.textContent : '';
        }
        
        // Store calculation data for quote request
        calculationData = {
            length, width, height, quantity, weight,
            surfacePrep: isSandblasting ? 'Smėliavimas' : 'Valymas ir nuriebalinimas',
            colorType: colorName,
            primer, secondCoat, oneSideOnly,
            complexity: complexityText,
            maskingCount, assemblyChecked, urgentChecked,
            totalPrice: totalPrice.toFixed(2),
            breakdown: breakdownHTML
        };
    }
    
    function sendQuoteRequest() {
        // Create detailed message from calculation data
        let message = `UŽKLAUSA IŠ KAINOS SKAIČIUOKLĖS\n\n`;
        message += `MATMENYS:\n`;
        message += `Ilgis: ${calculationData.length} mm\n`;
        message += `Aukštis: ${calculationData.height} mm\n`;
        message += `Gylis: ${calculationData.width} mm\n`;
        message += `Kiekis: ${calculationData.quantity} vnt.\n`;
        if (calculationData.weight > 0) {
            message += `Svoris: ${calculationData.weight} kg\n`;
        }
        message += `\n`;
        
        message += `DAŽYMO PARAMETRAI:\n`;
        message += `Paviršiaus paruošimas: ${calculationData.surfacePrep}\n`;
        message += `Spalvos tipas: ${calculationData.colorType}\n`;
        if (calculationData.primer) message += `✓ Gruntavimas\n`;
        if (calculationData.secondCoat) message += `✓ Antras dažų sluoksnis\n`;
        message += `Sudėtingumas: ${calculationData.complexity}\n`;
        message += `\n`;
        
        if (calculationData.maskingCount > 0 || calculationData.assemblyChecked || calculationData.urgentChecked) {
            message += `PAPILDOMOS PASLAUGOS:\n`;
            if (calculationData.maskingCount > 0) {
                message += `✓ Dalinis užmaskavimas: ${calculationData.maskingCount} vnt.\n`;
            }
            if (calculationData.assemblyChecked) {
                message += `✓ Surinkimas po dažymo\n`;
            }
            if (calculationData.urgentChecked) {
                message += `✓ Skubus užsakymas (0-1 d.d.)\n`;
            }
            message += `\n`;
        }
        
        message += `ORIENTACINĖ KAINA: ${calculationData.totalPrice} €\n`;
        
        // Redirect to contact page with pre-filled message
        const encodedMessage = encodeURIComponent(message);
        window.location.href = `contact.html?message=${encodedMessage}`;
    }
});
