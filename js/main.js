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
                entry.target.classList.add('card-visible');
            }
        });
    }, observerOptions);

    // Observe feature cards and service cards (initial hidden state handled by CSS)
    document.querySelectorAll(
        '.feature-card, .service-card, .about-card, .advantage-item, .spec-card, .process-step, .gallery-item, .service-section'
    ).forEach(card => {
        observer.observe(card);
    });

    // Section titles slide-in on scroll
    const titleObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('title-visible');
                titleObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    document.querySelectorAll('.section-title').forEach(t => titleObserver.observe(t));

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
                
                if (files && files.length > 0 && typeof supabase !== 'undefined' && supabase?.storage) {
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
                
                // Wait for EmailJS to finish loading if still in progress
                if (typeof emailjs === 'undefined' || !window._emailjsReady) {
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error('EmailJS timeout')), 8000);
                        const check = setInterval(() => {
                            if (window._emailjsReady) { clearInterval(check); clearTimeout(timeout); resolve(); }
                        }, 100);
                    });
                }
                
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
    
}
// Animations are defined in css/style.css

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
    
    // Styles for .lightbox, .lightbox-content, .lightbox-close, img are in css/style.css
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

// Keyframe animations are defined in css/style.css

// Defer non-critical UI widgets past first paint to avoid forced reflow
requestAnimationFrame(function() {

    // Back to Top Button
    var backToTopBtn = document.createElement('button');
    backToTopBtn.id = 'backToTop';
    backToTopBtn.innerHTML = '↑';
    backToTopBtn.setAttribute('aria-label', 'Back to top');
    document.body.appendChild(backToTopBtn);

    var _scrollTicking = false;
    window.addEventListener('scroll', function() {
        if (!_scrollTicking) {
            requestAnimationFrame(function() {
                backToTopBtn.classList.toggle('visible', window.scrollY > 300);
                _scrollTicking = false;
            });
            _scrollTicking = true;
        }
    }, { passive: true });

    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // WhatsApp Floating Button
    var whatsappBtn = document.createElement('a');
    whatsappBtn.href = 'https://wa.me/37062502563?text=Sveiki,%20norėčiau%20sužinoti%20daugiau%20apie%20miltelinio%20dažymo%20paslaugas';
    whatsappBtn.target = '_blank';
    whatsappBtn.rel = 'noopener noreferrer';
    whatsappBtn.id = 'whatsappBtn';
    whatsappBtn.innerHTML = `<svg viewBox="0 0 32 32" width="32" height="32"><path fill="currentColor" d="M16 0c-8.837 0-16 7.163-16 16 0 2.825 0.737 5.607 2.137 8.048l-2.137 7.952 7.933-2.127c2.42 1.37 5.173 2.127 8.067 2.127 8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 29.333c-2.547 0-5.053-0.72-7.24-2.080l-0.52-0.307-5.387 1.44 1.44-5.373-0.32-0.533c-1.44-2.4-2.24-5.147-2.24-7.973 0-7.36 5.973-13.333 13.333-13.333s13.333 5.973 13.333 13.333-5.973 13.333-13.333 13.333zM22.293 18.653c-0.4-0.2-2.347-1.16-2.72-1.293-0.36-0.133-0.627-0.2-0.893 0.2s-1.027 1.293-1.253 1.56c-0.24 0.267-0.467 0.307-0.867 0.107-0.4-0.2-1.68-0.627-3.2-1.987-1.187-1.067-1.987-2.373-2.213-2.773-0.24-0.4-0.027-0.613 0.173-0.813 0.187-0.173 0.4-0.467 0.6-0.693 0.2-0.24 0.267-0.4 0.4-0.667 0.133-0.267 0.067-0.493-0.027-0.693-0.107-0.2-0.893-2.147-1.227-2.933-0.32-0.773-0.653-0.667-0.893-0.68-0.227-0.013-0.493-0.013-0.76-0.013s-0.693 0.093-1.053 0.493c-0.36 0.4-1.387 1.36-1.387 3.307s1.413 3.84 1.613 4.107c0.2 0.267 2.827 4.32 6.853 6.053 0.96 0.413 1.707 0.667 2.293 0.853 0.96 0.307 1.84 0.267 2.533 0.16 0.773-0.12 2.347-0.96 2.68-1.893 0.333-0.933 0.333-1.72 0.24-1.893-0.107-0.187-0.373-0.293-0.773-0.493z"/></svg>`;
    whatsappBtn.setAttribute('aria-label', 'Contact via WhatsApp');
    document.body.appendChild(whatsappBtn);

    // #backToTop and #whatsappBtn styles are defined in css/style.css

    // Working Hours Indicator
    (function() {
        // ============================================================
        // DARBO LAIKO KONFIGŪRACIJA — redaguokite šiuos masyvus
        // ============================================================

        // Dienos KAI NEDIRBATE (šventės, atostogos ir pan.)
        // Formatas: 'MMMM-MM-DD'  pvz. '2026-03-11'
        var closedDates = [
            // '2026-12-25',
            // '2026-12-26',
        ];

        // Dienos KAI DIRBATE nepaisant savaitgalio ar datos
        // Formatas: 'MMMM-MM-DD'  pvz. '2026-03-14'
        var openDates = [
            // '2026-03-14',
        ];

        // ============================================================

        function isWorkingHours() {
            var now = new Date();
            var lt = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Vilnius' }));
            var dateStr = lt.getFullYear() + '-'
                + String(lt.getMonth() + 1).padStart(2, '0') + '-'
                + String(lt.getDate()).padStart(2, '0');
            var hour = lt.getHours();
            var min = lt.getMinutes();
            var timeNum = hour * 100 + min;
            var withinHours = timeNum >= 900 && timeNum < 1800;

            if (openDates.indexOf(dateStr) !== -1) return withinHours;
            if (closedDates.indexOf(dateStr) !== -1) return false;

            var day = lt.getDay(); // 0=Sun, 6=Sat
            return day >= 1 && day <= 5 && withinHours;
        }

        var open = isWorkingHours();
        var badge = document.createElement('li');
        badge.id = 'workHoursBadge';
        badge.innerHTML = '<span class="wh-badge">'
            + '<span class="wh-dot ' + (open ? 'open' : 'closed') + '"></span>'
            + (open ? 'Dirbame' : 'Ne darbo laikas')
            + '</span>';

        var nav = document.querySelector('.main-nav ul');
        if (nav) nav.appendChild(badge);
    })();

}); // end requestAnimationFrame

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}
