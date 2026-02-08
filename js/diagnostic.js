// Test darbuotojai.js funkcionalumą
console.log('=== DARBUOTOJAI.JS DIAGNOSTICS ===');

// 1. Check if EDGE_FUNCTIONS_URL is defined
if (typeof EDGE_FUNCTIONS_URL !== 'undefined') {
    console.log('✅ EDGE_FUNCTIONS_URL defined:', EDGE_FUNCTIONS_URL);
} else {
    console.error('❌ EDGE_FUNCTIONS_URL NOT DEFINED!');
}

// 2. Check if login form exists
const loginForm = document.getElementById('login-form');
if (loginForm) {
    console.log('✅ Login form found');
    
    // Check if submit event is attached
    const listeners = getEventListeners(loginForm);
    if (listeners && listeners.submit) {
        console.log('✅ Submit event listener attached:', listeners.submit.length, 'listeners');
    } else {
        console.error('❌ NO SUBMIT EVENT LISTENER!');
    }
} else {
    console.error('❌ Login form NOT FOUND!');
}

// 3. Check if handleLogin function exists
if (typeof handleLogin === 'function') {
    console.log('✅ handleLogin function exists');
} else {
    console.error('❌ handleLogin function NOT DEFINED!');
}

// 4. Check localStorage
const savedSession = localStorage.getItem('darbuotojai_session');
if (savedSession) {
    console.log('⚠️ Found saved session:', savedSession.substring(0, 30) + '...');
} else {
    console.log('ℹ️ No saved session');
}

// 5. Test fetch to Edge Function
console.log('🧪 Testing Edge Function accessibility...');
fetch('https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/darbuotojai-login', {
    method: 'OPTIONS'
})
.then(response => {
    console.log('✅ Edge Function accessible, status:', response.status);
})
.catch(error => {
    console.error('❌ Edge Function NOT accessible:', error.message);
});

console.log('=== END DIAGNOSTICS ===');
