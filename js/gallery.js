// Gallery Dynamic Loader - Automatically loads images from gallery-config.json
document.addEventListener('DOMContentLoaded', async function() {
    const galleryGrid = document.querySelector('.gallery-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');
    let allImages = [];

    // Load gallery configuration
    try {
        const response = await fetch('/gallery-config.json');
        const data = await response.json();
        allImages = data.images;

        // Generate gallery items
        if (allImages.length === 0) {
            galleryGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <p style="font-size: 1.2rem; color: var(--text-light);">
                        📸 Dar nėra nuotraukų galerijoje.<br><br>
                        Įkelkite nuotraukas į /assets/gallery/ folderius ir paleiskite:<br>
                        <code style="background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 4px; display: inline-block; margin-top: 10px;">python generate_gallery.py</code>
                    </p>
                </div>
            `;
        } else {
            renderGallery('all');
        }

    } catch (error) {
        console.error('Error loading gallery:', error);
        galleryGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <p style="font-size: 1.2rem; color: #ff6b6b;">
                    ❌ Klaida įkeliant galeriją. Patikrinkite gallery-config.json failą.
                </p>
            </div>
        `;
    }

    // Render gallery items
    function renderGallery(filter) {
        const filteredImages = filter === 'all' 
            ? allImages 
            : allImages.filter(img => img.category === filter);

        if (filteredImages.length === 0) {
            galleryGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px;">
                    <p style="font-size: 1.1rem; color: var(--text-light);">
                        Šioje kategorijoje dar nėra nuotraukų.
                    </p>
                </div>
            `;
            return;
        }

        galleryGrid.innerHTML = filteredImages.map(image => `
            <div class="gallery-item" data-category="${image.category}">
                <div class="gallery-image">
                    <img src="${image.path}" alt="${image.title}" loading="lazy">
                    <div class="gallery-overlay">
                        <h3>${image.title}</h3>
                        <p>${image.category_name}</p>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers for lightbox
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', function() {
                const img = this.querySelector('img');
                openLightbox(img.src, img.alt);
            });
        });
    }

    // Filter button handlers
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const filterValue = this.getAttribute('data-filter');
            renderGallery(filterValue);
        });
    });

    // Lightbox functionality
    function openLightbox(src, alt) {
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <span class="lightbox-close">&times;</span>
                <img src="${src}" alt="${alt}">
                <div class="lightbox-caption">${alt}</div>
            </div>
        `;
        document.body.appendChild(lightbox);

        setTimeout(() => lightbox.classList.add('active'), 10);

        lightbox.querySelector('.lightbox-close').addEventListener('click', () => {
            lightbox.classList.remove('active');
            setTimeout(() => lightbox.remove(), 300);
        });

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.classList.remove('active');
                setTimeout(() => lightbox.remove(), 300);
            }
        });
    }
});
