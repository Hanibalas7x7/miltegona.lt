// Supabase Configuration
const SUPABASE_URL = 'https://xyzttzqvbescdpihvyfu.supabase.co';
const SUPABASE_ANON_KEY = '***REMOVED***';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elements
const loadingState = document.getElementById('loading-state');
const validState = document.getElementById('valid-state');
const invalidState = document.getElementById('invalid-state');
const successState = document.getElementById('success-state');
const openGateBtn = document.getElementById('open-gate-btn');
const gateStatus = document.getElementById('gate-status');
const errorMessage = document.getElementById('error-message');

// Get code from URL
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

// Validate code on page load
window.addEventListener('DOMContentLoaded', async () => {
    if (!code) {
        showInvalidState('Kodas nerastas nuorodoje');
        return;
    }
    
    await validateCode(code);
});

// Validate code
async function validateCode(code) {
    try {
        // Get code from database
        const { data, error } = await supabase
            .from('gate_codes')
            .select('*')
            .eq('code', code)
            .single();
        
        if (error || !data) {
            showInvalidState('Kodas nerastas sistemoje arba jau ištrintas');
            return;
        }
        
        // Check if code is valid
        const now = new Date();
        
        if (data.unlimited) {
            showValidState();
            return;
        }
        
        const validFrom = new Date(data.valid_from);
        const validTo = new Date(data.valid_to);
        
        if (now < validFrom) {
            showInvalidState('⏳ Kodas dar negalioja.\n\nŠis kodas pradės galioti nuo: ' + formatDate(validFrom), 'pending');
            return;
        }
        
        if (now > validTo) {
            showInvalidState('❌ Šio kodo galiojimo laikas pasibaigė: ' + formatDate(validTo) + '\n\nKodas nebegalioja ir netrukus bus automatiškai ištrintas iš sistemos.', 'expired');
            return;
        }
        
        showValidState();
        
    } catch (error) {
        console.error('Error validating code:', error);
        showInvalidState('Klaida tikrinant kodą');
    }
}

// Show valid state
function showValidState() {
    loadingState.style.display = 'none';
    validState.style.display = 'block';
}

// Show invalid state
function showInvalidState(message, type = 'error') {
    loadingState.style.display = 'none';
    invalidState.style.display = 'block';
    
    // Update title based on type
    const titleElement = invalidState.querySelector('h1');
    if (type === 'pending') {
        titleElement.textContent = 'Kodas Dar Negalioja';
    } else if (type === 'expired') {
        titleElement.textContent = 'Kodas Nebegalioja';
    } else {
        titleElement.textContent = 'Netinkamas Kodas';
    }
    
    errorMessage.textContent = message;
}

// Show success state
function showSuccessState() {
    validState.style.display = 'none';
    successState.style.display = 'block';
}

// Open gate button click - calls Edge Function with rate limiting (60 req/hour)
openGateBtn.addEventListener('click', async () => {
    openGateBtn.disabled = true;
    gateStatus.textContent = 'Siunčiama komanda...';
    gateStatus.className = 'gate-status sending';
    
    try {
        // Call Supabase Edge Function to validate and open
        // Rate limiting: 60 requests per hour per IP
        const response = await fetch('https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/validate-and-open', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ code })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            // Handle different error types
            let errorText = result.error || 'Nepavyko atidaryti vartų';
            
            if (result.errorType === 'expired') {
                errorText = '❌ Šio kodo galiojimo laikas pasibaigė.\n\nKodas nebegalioja ir bus automatiškai ištrintas po 7 dienų.';
            } else if (result.errorType === 'not_found') {
                errorText = 'Kodas nerastas sistemoje arba jau ištrintas.';
            } else if (result.errorType === 'not_yet_valid') {
                errorText = 'Kodas dar negalioja. Bandykite vėliau.';
            }
            
            throw new Error(errorText);
        }
        
        // Command inserted successfully, get the command ID to monitor
        const commandId = result.commandId;
        
        gateStatus.textContent = 'Komanda išsiųsta. Tikrinama būsena...';
        gateStatus.className = 'gate-status sending';
        
        // Poll for status change (check every 1 second for up to 30 seconds)
        let attempts = 0;
        const maxAttempts = 30;
        const checkInterval = 1000; // 1 second
        
        const checkStatus = async () => {
            attempts++;
            
            try {
                const { data, error } = await supabase
                    .from('gate_commands')
                    .select('status')
                    .eq('id', commandId)
                    .single();
                
                if (error) throw error;
                
                if (data.status === 'completed') {
                    gateStatus.textContent = 'Vartai atidaryti sėkmingai!';
                    gateStatus.className = 'gate-status success';
                    setTimeout(() => showSuccessState(), 2000);
                    return;
                }
                
                if (data.status === 'failed') {
                    throw new Error('Komanda nepavyko');
                }
                
                // Still pending
                if (attempts < maxAttempts) {
                    setTimeout(checkStatus, checkInterval);
                } else {
                    // Timeout - show success anyway (command was sent)
                    gateStatus.textContent = 'Komanda išsiųsta. Vartai turėtų atidaryti.';
                    gateStatus.className = 'gate-status success';
                    setTimeout(() => showSuccessState(), 2000);
                }
            } catch (error) {
                console.error('Error checking status:', error);
                // Show success anyway - command was created
                gateStatus.textContent = 'Komanda išsiųsta. Vartai turėtų atidaryti.';
                gateStatus.className = 'gate-status success';
                setTimeout(() => showSuccessState(), 2000);
            }
        };
        
        // Start checking status
        setTimeout(checkStatus, checkInterval);
        
    } catch (error) {
        console.error('Error sending command:', error);
        
        let errorText = 'Klaida siunčiant komandą. Bandykite dar kartą.';
        if (error.message === 'Per daug užklausų. Bandykite vėliau.') {
            errorText = error.message;
        }
        
        gateStatus.textContent = errorText;
        gateStatus.className = 'gate-status error';
        openGateBtn.disabled = false;
    }
});

// Format date to Lithuanian local time
function formatDate(date) {
    return date.toLocaleString('lt-LT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Vilnius'
    });
}
