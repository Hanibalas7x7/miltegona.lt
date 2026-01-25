// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    
    // Pre-fill contact form message from URL parameter (from calculator)
    const urlParams = new URLSearchParams(window.location.search);
    const messageParam = urlParams.get('message');
    if (messageParam) {
        const messageTextarea = document.getElementById('message');
        if (messageTextarea) {
            messageTextarea.value = decodeURIComponent(messageParam);
            // Scroll to form
            setTimeout(() => {
                messageTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            this.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.header-content')) {
            mainNav?.classList.remove('active');
            mobileMenuToggle?.classList.remove('active');
        }
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            // Skip if href is just "#" or empty
            if (!href || href === '#' || href.length <= 1) {
                return;
            }
            
            e.preventDefault();
            try {
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            } catch (error) {
                console.warn('Invalid selector:', href);
            }
        });
    });

    // Add scroll animation for elements
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe feature cards and service cards
    document.querySelectorAll('.feature-card, .service-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });

    // Initialize Supabase client
    const supabase = window.supabase ? window.supabase.createClient(
        'https://xyzttzqvbescdpihvyfu.supabase.co',
        '***REMOVED***'
    ) : null;

    // Form validation
    const contactForm = document.querySelector('#contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            // Disable button and show loading
            submitBtn.disabled = true;
            submitBtn.textContent = 'Siunčiama...';
            
            try {
                // Get form data
                const formData = {
                    from_name: this.querySelector('#name').value,
                    from_email: this.querySelector('#email').value,
                    phone: this.querySelector('#phone').value || 'Nenurodytas',
                    message: this.querySelector('#message').value
                };
                
                // Handle file uploads
                const fileInput = this.querySelector('#files');
                const files = fileInput?.files;
                let fileLinks = [];
                
                if (files && files.length > 0 && supabase) {
                    submitBtn.textContent = 'Įkeliami failai...';
                    
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const timestamp = Date.now();
                        const fileName = `${timestamp}_${file.name}`;
                        
                        // Upload file to Supabase Storage
                        const { data, error } = await supabase.storage
                            .from('contact-attachments')
                            .upload(fileName, file, {
                                cacheControl: '3600',
                                upsert: false
                            });
                        
                        if (error) {
                            console.error('Upload error:', error);
                            continue;
                        }
                        
                        // Get public URL
                        const { data: urlData } = supabase.storage
                            .from('contact-attachments')
                            .getPublicUrl(fileName);
                        
                        if (urlData?.publicUrl) {
                            fileLinks.push(`${file.name}: ${urlData.publicUrl}`);
                        }
                    }
                }
                
                // Add file links to message
                let fullMessage = formData.message;
                if (fileLinks.length > 0) {
                    fullMessage += '\n\n=== PRIDĖTI FAILAI ===\n' + fileLinks.join('\n');
                }
                
                // Prepare template parameters
                const templateParams = {
                    from_name: formData.from_name,
                    from_email: formData.from_email,
                    phone: formData.phone,
                    message: fullMessage
                };
                
                submitBtn.textContent = 'Siunčiamas laiškas...';
                
                // Send email using EmailJS
                await emailjs.send('service_54ci6he', 'template_m5zwm5m', templateParams);
                
                showMessage('Jūsų žinutė sėkmingai išsiųsta!', 'success');
                contactForm.reset();
                
            } catch (error) {
                showMessage('Klaida siunčiant žinutę. Bandykite dar kartą.', 'error');
                console.error('Form submission error:', error);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // Gallery lightbox functionality
    const galleryItems = document.querySelectorAll('.gallery-item');
    if (galleryItems.length > 0) {
        galleryItems.forEach(item => {
            item.addEventListener('click', function() {
                const imgSrc = this.querySelector('img').src;
                openLightbox(imgSrc);
            });
        });
    }
});

// Show message function
function showMessage(message, type) {
    // Create overlay
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
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        max-width: 400px;
        width: 90%;
        text-align: center;
        animation: scaleIn 0.3s ease;
    `;
    
    // Icon
    const icon = type === 'success' ? '✓' : '✕';
    const iconColor = type === 'success' ? '#10b981' : '#ef4444';
    
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
            color: #1a1d23;
            font-size: 1.25rem;
        ">${type === 'success' ? 'Sėkmingai!' : 'Klaida'}</h3>
        <p style="
            margin: 0 0 1.5rem;
            color: #6b7280;
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
    
    // Close on button click
    const okBtn = modal.querySelector('#modal-ok-btn');
    okBtn.addEventListener('click', () => {
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => overlay.remove(), 300);
        }
    });
    
    // Add animations to document if not present
    if (!document.querySelector('#modal-animations')) {
        const style = document.createElement('style');
        style.id = 'modal-animations';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes scaleIn {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            #modal-ok-btn:hover {
                opacity: 0.9;
            }
        `;
        document.head.appendChild(style);
    }
}

// Lightbox function
function openLightbox(imgSrc) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
        <div class="lightbox-content">
            <span class="lightbox-close">&times;</span>
            <img src="${imgSrc}" alt="Gallery image">
        </div>
    `;
    
    lightbox.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    const content = lightbox.querySelector('.lightbox-content');
    content.style.cssText = `
        position: relative;
        max-width: 90%;
        max-height: 90%;
    `;
    
    const closeBtn = lightbox.querySelector('.lightbox-close');
    closeBtn.style.cssText = `
        position: absolute;
        top: -40px;
        right: 0;
        font-size: 40px;
        color: white;
        cursor: pointer;
        font-weight: 300;
    `;
    
    const img = lightbox.querySelector('img');
    img.style.cssText = `
        max-width: 100%;
        max-height: 90vh;
        object-fit: contain;
    `;
    
    document.body.appendChild(lightbox);
    document.body.style.overflow = 'hidden';
    
    // Close lightbox
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox || e.target === closeBtn) {
            document.body.style.overflow = '';
            lightbox.remove();
        }
    });
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;
document.head.appendChild(style);
