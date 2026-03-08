// Cookie Consent Banner - GDPR/ePrivacy
(function () {
    var CONSENT_KEY = 'cookie_consent';
    var GA_ID = 'G-1VLD2QNVLR';

    function loadGA() {
        if (window._gaLoaded) return;
        window._gaLoaded = true;
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
        document.head.appendChild(s);
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', GA_ID);
    }

    function hideBanner() {
        var b = document.getElementById('cookie-banner');
        if (b) { b.style.transition = 'opacity .3s'; b.style.opacity = '0'; setTimeout(function(){b.remove();}, 300); }
    }

    function accept() {
        localStorage.setItem(CONSENT_KEY, 'accepted');
        hideBanner();
        loadGA();
    }

    function decline() {
        localStorage.setItem(CONSENT_KEY, 'declined');
        hideBanner();
    }

    function showBanner() {
        // Inject banner CSS lazily, just before showing
        var style = document.createElement('style');
        style.textContent = [
            '#cookie-banner{',
                'position:fixed;bottom:0;left:0;right:0;z-index:99999;',
                'background:#1a1d23;border-top:2px solid #ff6b35;',
                'padding:14px 20px;box-shadow:0 -4px 20px rgba(0,0,0,0.4);',
            '}',
            '.cookie-banner-content{',
                'max-width:1200px;margin:0 auto;',
                'display:flex;align-items:center;gap:16px;flex-wrap:wrap;',
            '}',
            '.cookie-banner-content p{',
                'flex:1;min-width:220px;margin:0;',
                'color:rgba(255,255,255,0.85);font-size:0.88rem;line-height:1.5;',
            '}',
            '.cookie-banner-content a{color:#ff6b35;text-decoration:underline;}',
            '.cookie-banner-buttons{display:flex;gap:10px;flex-shrink:0;}',
            '.cookie-btn{',
                'padding:8px 20px;border:none;border-radius:6px;',
                'font-size:0.88rem;font-weight:600;cursor:pointer;transition:opacity .2s;',
            '}',
            '.cookie-btn:hover{opacity:0.85;}',
            '.cookie-btn-accept{background:#3ba560;color:#1a1d23;}',
            '.cookie-btn-decline{background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.2);}',
            '@media(max-width:600px){',
                '.cookie-banner-content{flex-direction:column;align-items:flex-start;}',
                '.cookie-banner-buttons{width:100%;justify-content:flex-end;}',
            '}'
        ].join('');
        document.head.appendChild(style);

        var isEN = document.documentElement.lang === 'en';
        var b = document.createElement('div');
        b.id = 'cookie-banner';
        b.innerHTML =
            '<div class="cookie-banner-content">' +
                '<p>' + (isEN
                    ? 'We use <strong>Google Analytics</strong> cookies to collect visitor statistics. By accepting, you help us improve the website. <a href="/privacy.html">Privacy policy</a>.'
                    : 'Naudojame <strong>Google Analytics</strong> slapukus lankytojų statistikai rinkti. Sutikdami padėsite mums gerinti svetainę. <a href="/privacy.html">Privatumo politika</a>.') + '</p>' +
                '<div class="cookie-banner-buttons">' +
                    '<button class="cookie-btn cookie-btn-accept" onclick="cookieConsent.accept()">' + (isEN ? 'Accept' : 'Sutinku') + '</button>' +
                    '<button class="cookie-btn cookie-btn-decline" onclick="cookieConsent.decline()">' + (isEN ? 'Decline' : 'Nesutinku') + '</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(b);
    }

    window.cookieConsent = { accept: accept, decline: decline };

    var consent = localStorage.getItem(CONSENT_KEY);
    if (consent === 'accepted') {
        // Load GA after first paint via rAF to avoid forced reflow
        requestAnimationFrame(function() { loadGA(); });
    } else if (!consent) {
        // Show banner after first paint — no impact on initial render
        requestAnimationFrame(function() { showBanner(); });
    }
    // 'declined' - do nothing, no GA, no banner
})();
