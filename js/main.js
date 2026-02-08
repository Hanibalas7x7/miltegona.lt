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
            // Use requestAnimationFrame to avoid forced reflow
            requestAnimationFrame(() => {
                setTimeout(() => {
                    messageTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            });
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

    // Supabase client removed - no longer needed for public pages
    // Contact form now uses Edge Functions or backend API

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
                
                submitBtn.innerHTML = '<span class="spinner"></span> Siunčiama...';
                submitBtn.disabled = true;
                
                // Send email using EmailJS
                await emailjs.send('service_54ci6he', 'template_m5zwm5m', templateParams);
                
                showMessage('Jūsų žinutė sėkmingai išsiųsta!', 'success');
                contactForm.reset();
                
            } catch (error) {
                showMessage('Klaida siunčiant žinutę. Bandykite dar kartą.', 'error');
                console.error('Form submission error:', error);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
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

// Back to Top Button
const backToTopBtn = document.createElement('button');
backToTopBtn.id = 'backToTop';
backToTopBtn.innerHTML = '↑';
backToTopBtn.setAttribute('aria-label', 'Back to top');
document.body.appendChild(backToTopBtn);

window.addEventListener('scroll', function() {
    if (window.pageYOffset > 300) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
});

backToTopBtn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// WhatsApp Floating Button
const whatsappBtn = document.createElement('a');
whatsappBtn.href = 'https://wa.me/37062502563?text=Sveiki,%20norėčiau%20sužinoti%20daugiau%20apie%20miltelinio%20dažymo%20paslaugas';
whatsappBtn.target = '_blank';
whatsappBtn.rel = 'noopener noreferrer';
whatsappBtn.id = 'whatsappBtn';
whatsappBtn.innerHTML = `<svg viewBox="0 0 32 32" width="32" height="32"><path fill="currentColor" d="M16 0c-8.837 0-16 7.163-16 16 0 2.825 0.737 5.607 2.137 8.048l-2.137 7.952 7.933-2.127c2.42 1.37 5.173 2.127 8.067 2.127 8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 29.333c-2.547 0-5.053-0.72-7.24-2.080l-0.52-0.307-5.387 1.44 1.44-5.373-0.32-0.533c-1.44-2.4-2.24-5.147-2.24-7.973 0-7.36 5.973-13.333 13.333-13.333s13.333 5.973 13.333 13.333-5.973 13.333-13.333 13.333zM22.293 18.653c-0.4-0.2-2.347-1.16-2.72-1.293-0.36-0.133-0.627-0.2-0.893 0.2s-1.027 1.293-1.253 1.56c-0.24 0.267-0.467 0.307-0.867 0.107-0.4-0.2-1.68-0.627-3.2-1.987-1.187-1.067-1.987-2.373-2.213-2.773-0.24-0.4-0.027-0.613 0.173-0.813 0.187-0.173 0.4-0.467 0.6-0.693 0.2-0.24 0.267-0.4 0.4-0.667 0.133-0.267 0.067-0.493-0.027-0.693-0.107-0.2-0.893-2.147-1.227-2.933-0.32-0.773-0.653-0.667-0.893-0.68-0.227-0.013-0.493-0.013-0.76-0.013s-0.693 0.093-1.053 0.493c-0.36 0.4-1.387 1.36-1.387 3.307s1.413 3.84 1.613 4.107c0.2 0.267 2.827 4.32 6.853 6.053 0.96 0.413 1.707 0.667 2.293 0.853 0.96 0.307 1.84 0.267 2.533 0.16 0.773-0.12 2.347-0.96 2.68-1.893 0.333-0.933 0.333-1.72 0.24-1.893-0.107-0.187-0.373-0.293-0.773-0.493z"/></svg>`;
whatsappBtn.setAttribute('aria-label', 'Contact via WhatsApp');
document.body.appendChild(whatsappBtn);

// Back to Top & WhatsApp CSS
const floatingBtnsStyle = document.createElement('style');
floatingBtnsStyle.textContent = `
    #backToTop {
        position: fixed;
        bottom: 90px;
        right: 20px;
        background: #ff6b35;
        color: white;
        border: none;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        font-size: 24px;
        cursor: pointer;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 999;
        box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
    }
    
    #backToTop.visible {
        opacity: 1;
        visibility: visible;
    }
    
    #backToTop:hover {
        background: #e55a2b;
        transform: translateY(-3px);
        box-shadow: 0 6px 16px rgba(255, 107, 53, 0.6);
    }
    
    #whatsappBtn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #25D366;
        color: white;
        border-radius: 50%;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        box-shadow: 0 4px 12px rgba(37, 211, 102, 0.4);
        transition: all 0.3s ease;
        z-index: 1000;
        animation: whatsappPulse 2s infinite;
    }
    
    #whatsappBtn:hover {
        background: #20BA5A;
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(37, 211, 102, 0.6);
    }
    
    @keyframes whatsappPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    
    @media (max-width: 768px) {
        #backToTop {
            bottom: 80px;
            right: 15px;
            width: 45px;
            height: 45px;
            font-size: 20px;
        }
        
        #whatsappBtn {
            bottom: 15px;
            right: 15px;
            width: 55px;
            height: 55px;
        }
    }
`;
document.head.appendChild(floatingBtnsStyle);
