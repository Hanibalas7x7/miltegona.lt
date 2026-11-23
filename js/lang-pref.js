// Remembers the chosen language (LT/EN) for the employee portal and gate pages.
// Loaded synchronously in <head> so the redirect happens before the page renders.
(function () {
    'use strict';
    var KEY = 'miltegona_lang';
    var LT_TO_EN = { '/darbuotojai/': '/en/workers/', '/atidaryti/': '/en/open/' };

    function get() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }
    function set(lang) {
        try { localStorage.setItem(KEY, lang); } catch (e) { /* storage unavailable */ }
    }

    if (document.documentElement.lang === 'en') {
        set('en');
    } else if (get() === 'en') {
        var path = location.pathname.replace(/index\.html$/, '');
        if (path.slice(-1) !== '/') path += '/';
        if (LT_TO_EN[path]) {
            location.replace(LT_TO_EN[path] + location.search + location.hash);
        }
    }

    // The switch links store the explicit choice before navigating
    document.addEventListener('click', function (e) {
        var link = e.target.closest && e.target.closest('.lang-switch a[data-lang]');
        if (link) set(link.getAttribute('data-lang'));
    });
})();
