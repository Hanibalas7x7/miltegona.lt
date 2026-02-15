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

// Gallery Dynamic Loader - Loads images from Supabase
document.addEventListener('DOMContentLoaded', async function() {
    const galleryGrid = document.querySelector('.gallery-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');
    let allImages = [];

    // Supabase configuration
    const SUPABASE_URL = 'https://xyzttzqvbescdpihvyfu.supabase.co';
    const GALLERY_EDGE_URL = `${SUPABASE_URL}/functions/v1/manage-gallery`;
    const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/gallery-images`;

    // Category mapping
    const CATEGORY_NAMES = {
        'metalwork': 'Metalinės konstrukcijos',
        'furniture': 'Baldai',
        'automotive': 'Automobilių dalys',
        'industrial': 'Pramoninė įranga'
    };

    // Load gallery from Supabase
    try {
        const response = await fetch(GALLERY_EDGE_URL, {
            method: 'GET'
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Klaida įkeliant nuotraukas');
        }

        // Transform Supabase data to gallery format
        allImages = result.data.map(img => ({
            id: img.id,
            title: img.title || '',  // Don't fallback to filename
            description: img.description || '',
            category: img.category,
            category_name: CATEGORY_NAMES[img.category],
            path: `${STORAGE_URL}/${img.storage_path}`,
            thumbnail: `${STORAGE_URL}/${img.thumbnail_path}`,
            thumbnail_small: `${STORAGE_URL}/${img.thumbnail_small_path}`,
            width: img.width,
            height: img.height
        }));

        // Add structured data for SEO (Google Image Search)
        if (allImages.length > 0) {
            const schemaData = {
                "@context": "https://schema.org",
                "@type": "ImageGallery",
                "name": "Miltelinio dažymo darbų galerija - UAB Miltegona",
                "description": "Peržiūrėkite mūsų atliktų miltelinio dažymo darbų galeriją. Metalinės konstrukcijos, baldai, automobilių dalys ir pramoninė įranga.",
                "image": allImages.map(img => ({
                    "@type": "ImageObject",
                    "contentUrl": img.path,
                    "thumbnail": img.thumbnail,
                    "name": img.title || img.category_name,
                    "description": img.description || `${img.category_name} - miltelinis dažymas`,
                    "width": img.width,
                    "height": img.height,
                    "encodingFormat": "image/avif"
                }))
            };
            
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.text = JSON.stringify(schemaData);
            document.head.appendChild(script);
        }

        // Generate gallery items
        if (allImages.length === 0) {
            galleryGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <p style="font-size: 1.2rem; color: var(--text-light);">
                        📸 Galerija tuščia. Įkelkite pirmas nuotraukas per kontrolės skiltį.
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
                    ❌ Klaida įkeliant galeriją: ${error.message}
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
                    <img 
                        srcset="${image.thumbnail_small} 200w, ${image.thumbnail} 400w, ${image.path} 1920w"
                        sizes="(max-width: 768px) 200px, (max-width: 1200px) 400px, 400px"
                        src="${image.thumbnail}" 
                        alt="${image.title || image.category_name}" 
                        loading="lazy">
                    <div class="gallery-overlay">
                        ${image.title ? `<h3>${image.title}</h3>` : ''}
                        <p>${image.category_name}</p>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers for lightbox
        document.querySelectorAll('.gallery-item').forEach((item, index) => {
            item.addEventListener('click', function() {
                openLightbox(index, filteredImages);
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
    let currentLightbox = null;
    let currentIndex = 0;
    let currentImages = [];

    function openLightbox(index, images) {
        currentIndex = index;
        currentImages = images;
        showLightboxImage();
    }

    function showLightboxImage() {
        const image = currentImages[currentIndex];
        
        // Remove old lightbox if exists
        if (currentLightbox) {
            currentLightbox.remove();
        }

        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <span class="lightbox-close">&times;</span>
                ${currentImages.length > 1 ? `
                    <button class="lightbox-prev" aria-label="Ankstesnė">‹</button>
                    <button class="lightbox-next" aria-label="Kita">›</button>
                ` : ''}
                <img src="${image.path}" alt="${image.title || image.category_name}">
                ${image.title ? `<div class="lightbox-caption">${image.title}</div>` : ''}
            </div>
        `;
        document.body.appendChild(lightbox);
        currentLightbox = lightbox;

        setTimeout(() => lightbox.classList.add('active'), 10);

        // Close button
        lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);

        // Navigation buttons
        if (currentImages.length > 1) {
            lightbox.querySelector('.lightbox-prev').addEventListener('click', (e) => {
                e.stopPropagation();
                currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
                showLightboxImage();
            });

            lightbox.querySelector('.lightbox-next').addEventListener('click', (e) => {
                e.stopPropagation();
                currentIndex = (currentIndex + 1) % currentImages.length;
                showLightboxImage();
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboard);

        // Click outside to close
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }

    function handleKeyboard(e) {
        if (!currentLightbox) return;
        
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft' && currentImages.length > 1) {
            currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
            showLightboxImage();
        } else if (e.key === 'ArrowRight' && currentImages.length > 1) {
            currentIndex = (currentIndex + 1) % currentImages.length;
            showLightboxImage();
        }
    }

    function closeLightbox() {
        if (currentLightbox) {
            currentLightbox.classList.remove('active');
            setTimeout(() => {
                currentLightbox.remove();
                currentLightbox = null;
            }, 300);
            document.removeEventListener('keydown', handleKeyboard);
        }
    }
});
