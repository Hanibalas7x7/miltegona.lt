// English translation layer for the employee portal (/en/workers/) and gate page (/en/open/).
// The Lithuanian pages and scripts are reused as-is; every visible text node, placeholder,
// title and server message is translated here, including content rendered later by scripts.
// Only active when <html lang="en">.
(function () {
    'use strict';
    if (document.documentElement.lang !== 'en') return;

    const EXACT = {
        // ---- Portal: login / header ----
        'Darbuotojų Portalas - UAB Miltegona': 'Employee Portal - UAB Miltegona',
        'Darbuotojų Portalas': 'Employee Portal',
        'Prisijunkite su savo el. paštu': 'Sign in with your email',
        'El. paštas': 'Email',
        'Slaptažodis': 'Password',
        'Prisijungti': 'Sign in',
        'Nustatymai': 'Settings',
        'Pakeisti slaptažodį / el. paštą': 'Change password / email',
        'Atsijungti': 'Log out',
        'Sveiki,': 'Hello,',
        'Kraunama...': 'Loading...',

        // ---- Clock widget ----
        'Atvykau': 'Check in',
        'Išeinu': 'Check out',
        'Neprisijungta': 'Not checked in',
        'Išėjimo laikas': 'Check-out time',
        'Pasirinkite tikslų išėjimo datą ir laiką:': 'Select the exact check-out date and time:',
        'Patvirtinti': 'Confirm',
        'Patvirtinti išėjimą': 'Confirm check-out',
        'Pataisyti': 'Edit',
        '✅ Atvykimas pažymėtas!': '✅ Check-in recorded!',
        '🏁 Darbo diena baigta!': '🏁 Workday finished!',
        'Įveskite datą ir laiką': 'Enter the date and time',

        // ---- Tabs and tables ----
        'Mėnesio Suvestinė': 'Monthly Summary',
        'Mėnesio Atlyginimai': 'Monthly Salary',
        'Dažų Valdymas': 'Paint Management',
        'Data': 'Date',
        'Pradžia': 'Start',
        'Pabaiga': 'End',
        'Valandos': 'Hours',
        'Iš viso:': 'Total:',
        'Nėra duomenų': 'No data',
        'Šiam mėnesiui nėra įrašų': 'No records for this month',
        'Šiam mėnesiui nėra apskaičiuoto atlyginimo': 'No salary has been calculated for this month',
        'Norminės darbo dienos:': 'Standard working days:',
        'Pradirbta dienų:': 'Days worked:',
        'Norminės valandos:': 'Standard hours:',
        'Pradirbta valandų:': 'Hours worked:',
        'Bruto ant popieriaus:': 'Gross (on paper):',
        'Pritaikytas NPD:': 'Applied NPD (tax-free allowance):',
        'GPM (20%):': 'Income tax (GPM, 20%):',
        'Sodra darbuotojo:': 'Social security (employee):',
        'Sodra darbdavio:': 'Social security (employer):',
        'Neto (į rankas):': 'Net (take-home):',
        'Avansų suma:': 'Advances:',
        'Priedas:': 'Bonus:',
        'VISO:': 'TOTAL:',
        'Darbo vietos kaina:': 'Cost of workplace:',

        // ---- Paints ----
        'Pridėti Naujus Dažus': 'Add New Paint',
        'Ieškoti pagal ML kodą, spalvą, gamintoją...': 'Search by ML code, colour, manufacturer...',
        'Redaguoti Dažą': 'Edit Paint',
        'Atnaujinti Svorį': 'Update Weight',
        'ML Kodas *': 'ML Code *',
        'ML Kodas': 'ML Code',
        'Kodas': 'Code',
        'Gamintojas *': 'Manufacturer *',
        'Gamintojas': 'Manufacturer',
        'Spalva': 'Colour',
        'Svoris (kg) *': 'Weight (kg) *',
        'Svoris': 'Weight',
        'Gruntas': 'Primer',
        'Nėra': 'None',
        'X (Paprastas)': 'X (Standard)',
        'Zn (Su cinku)': 'Zn (With zinc)',
        'Blizgumas': 'Gloss',
        'Paviršius': 'Surface',
        'Efektas': 'Effect',
        'Nėra efekto': 'No effect',
        'Cinkui': 'For zinc',
        'Sudėtis': 'Composition',
        'Kaina (€)': 'Price (€)',
        'Kaina': 'Price',
        'Veiksmai': 'Actions',
        'Redaguoti': 'Edit',
        'Redaguoti dažą': 'Edit paint',
        'Spustelėkite norėdami pakeisti svorį': 'Click to change the weight',
        'Pasirinkite arba įrašykite...': 'Select or type...',
        'Dabartinis svoris:': 'Current weight:',
        'Naujas svoris (kg) *': 'New weight (kg) *',
        'Jei nustatote 0 kg, dažas bus pašalintas iš sąrašo': 'If you set 0 kg, the paint will be removed from the list',
        'Atšaukti': 'Cancel',
        'Išsaugoti': 'Save',
        'Saugoma...': 'Saving...',
        'Skenuojama...': 'Scanning...',
        'Prašome palaukti': 'Please wait',
        'Nuskenuota': 'Scanned',
        'Produkto kodas': 'Product code',
        'RAL/Spalva': 'RAL/Colour',
        'Dažų sąrašas tuščias': 'The paint list is empty',
        'Klaida įkeliant dažus': 'Error loading paints',
        'Dažas sėkmingai pridėtas!': 'Paint added successfully!',
        'Dažas sėkmingai atnaujintas!': 'Paint updated successfully!',
        'Svoris sėkmingai atnaujintas!': 'Weight updated successfully!',
        'Dažas nerastas': 'Paint not found',
        'Klaida išsaugant dažą': 'Error saving the paint',
        'Klaida atnaujinant svorį': 'Error updating the weight',
        'Nežinoma klaida': 'Unknown error',
        'Klaida: ML kodas nerastas': 'Error: ML code not found',
        'Klaida: forma nerasta. Atverkite "Pridėti Naujus Dažus" langą ir bandykite dar kartą.':
            'Error: form not found. Open the "Add New Paint" window and try again.',
        'Lipduko duomenys nuskaityti, bet nepavyko atpažinti specifinių laukų. Bandykite su aiškesne nuotrauka.':
            'The label was read, but no specific fields could be recognised. Try a clearer photo.',

        // ---- Account settings ----
        'Paskyros nustatymai': 'Account settings',
        'Naujas el. paštas': 'New email',
        'Naujas slaptažodis': 'New password',
        'Pakartokite slaptažodį': 'Repeat password',
        'Pakartokite naują slaptažodį': 'Repeat the new password',
        'Palikite tuščią, jei nekeičiate': 'Leave empty to keep unchanged',
        'Įveskite naują el. paštą ir/arba slaptažodį.': 'Enter a new email and/or password.',
        'Slaptažodis turi būti bent 8 simbolių ir turėti didžiąją raidę, mažąją raidę ir skaičių.':
            'The password must be at least 8 characters long and contain an uppercase letter, a lowercase letter and a number.',
        'Slaptažodžiai nesutampa.': 'The passwords do not match.',
        'Sesija baigėsi. Prisijunkite iš naujo.': 'Session expired. Please sign in again.',
        'Klaida atnaujinant duomenis.': 'Error updating the data.',
        'Duomenys sėkmingai atnaujinti! Prisijunkite iš naujo.': 'Data updated successfully! Please sign in again.',
        'Serverio klaida. Bandykite vėliau.': 'Server error. Please try again later.',

        // ---- Generic / server messages ----
        'Klaida': 'Error',
        'Serverio klaida': 'Server error',
        'Įvyko klaida': 'An error occurred',
        'Įvyko klaida. Bandykite vėliau.': 'An error occurred. Please try again later.',
        'Prisijungimo klaida': 'Login error',
        'Slaptažodis turi būti bent 6 simbolių': 'The password must be at least 6 characters long',
        'Per daug bandymų. Bandykite vėliau.': 'Too many attempts. Please try again later.',
        'Per daug užklausų. Bandykite vėliau.': 'Too many requests. Please try again later.',
        'El. paštas ir slaptažodis privalomi': 'Email and password are required',
        'Neteisingas el. paštas arba slaptažodis': 'Incorrect email or password',
        'Vartotojas nerastas': 'User not found',
        'Prieiga neleista': 'Access denied',
        'Darbuotojas nerastas': 'Employee not found',
        'Authorization header privalomas': 'Authorization header is required',
        'Netinkama sesija': 'Invalid session',
        'Netinkama sesija. Prisijunkite iš naujo.': 'Invalid session. Please sign in again.',
        'Vartotojas nerastas arba prieiga neleista': 'User not found or access denied',
        'Reikalingas bent el. paštas arba slaptažodis': 'An email or a password is required',
        'Darbuotojo įrašas nerastas': 'Employee record not found',
        'Veiksmas nenurodytas': 'Action not specified',
        'Neteisinga datos formato': 'Invalid date format',
        'Šiandien jau pažymėjote atvykimą': 'You have already checked in today',
        'Klaida žymint atvykimą': 'Error recording check-in',
        'Šiandien nepažymėjote atvykimo': 'You have not checked in today',
        'Šiandien jau pažymėjote išvykimą': 'You have already checked out today',
        'Klaida žymint išvykimą': 'Error recording check-out',
        'Nežinomas veiksmas': 'Unknown action',
        'Metai ir mėnuo privalomi': 'Year and month are required',

        // ---- Gate page ----
        'Vartų Atidarymas - UAB Miltegona': 'Gate Opening - UAB Miltegona',
        'Tikrinama...': 'Checking...',
        'Kodas Galioja!': 'Code Valid!',
        'Pasirinkite veiksmą': 'Choose an action',
        'Atidaryti Teritorijos Vartus': 'Open Territory Gate',
        'Pastato Vartai': 'Building Gate',
        'Atidaryti': 'Open',
        'Uždaryti': 'Close',
        'Šviesa': 'Light',
        'Išjungti Šviesą': 'Turn Light Off',
        'Įjungti Šviesą': 'Turn Light On',
        'Netinkamas Kodas': 'Invalid Code',
        'Kodas Dar Negalioja': 'Code Not Yet Valid',
        'Kodas Nebegalioja': 'Code Expired',
        'Kodas negalioja arba pasibaigė galiojimo laikas': 'The code is invalid or has expired',
        'Grįžti į Pradžią': 'Back to Home',
        'Vartai Atidaromi!': 'Gate Opening!',
        'Komanda išsiųsta. Vartai atidarys po kelių sekundžių.': 'Command sent. The gate will open in a few seconds.',
        'Kodas nerastas nuorodoje': 'Code not found in the link',
        'Jungiamasi prie serverio...': 'Connecting to the server...',
        'Serveris nepasiekiamas. Patikrinkite ryšį ir bandykite dar kartą.': 'Server unreachable. Check your connection and try again.',
        'Klaida tikrinant kodą': 'Error checking the code',
        'Siunčiama komanda...': 'Sending command...',
        'Komanda išsiųsta. Tikrinama būsena...': 'Command sent. Checking status...',
        'Nepavyko atlikti veiksmo': 'Could not perform the action',
        'Nepavyko atidaryti vartų': 'Could not open the gate',
        'Klaida siunčiant komandą. Bandykite dar kartą.': 'Error sending the command. Please try again.',
        'Kodas nerastas sistemoje arba jau ištrintas.': 'The code was not found in the system or has already been deleted.',
        'Kodas nerastas sistemoje arba jau ištrintas': 'The code was not found in the system or has already been deleted',
        'Kodas dar negalioja. Bandykite vėliau.': 'The code is not valid yet. Please try later.',
        'Kodas dar negalioja': 'The code is not valid yet',
        'Kodo galiojimo laikas pasibaigė': 'The code has expired',
        'Kodas nenurodytas': 'Code not specified',
        'Kodas nerastas': 'Code not found',
        'Neteisingas kodas': 'Incorrect code',
        'Neleidžiamas veiksmas': 'Action not allowed',
        'Neteisingas irenginio ID arba busena': 'Invalid device ID or state',
        'Netinkamas kodas': 'Invalid code',
        '✅ Teritorijos vartai atidaryti sėkmingai!': '✅ Territory gate opened successfully!',
        '✅ Pastato vartai atidaromi...': '✅ Building gate is opening...',
        '✅ Pastato vartai uždaromi...': '✅ Building gate is closing...',
        '✅ Šviesa išjungta': '✅ Light turned off',
        '✅ Šviesa įjungta': '✅ Light turned on',
        '❌ Šio kodo galiojimo laikas pasibaigė.\n\nKodas nebegalioja ir bus automatiškai ištrintas po 7 dienų.':
            '❌ This code has expired.\n\nThe code is no longer valid and will be deleted automatically after 7 days.'
    };

    // [regex, replacement string | function(match, ...groups)]
    const PATTERNS = [
        [/^Atvyko (\d{2}:\d{2})$/, 'Arrived $1'],
        [/^Baigė (\d{2}:\d{2}) \(atvyko (\d{2}:\d{2})\)$/, 'Finished $1 (arrived $2)'],
        [/^Išėjimo laikas: (.+)$/, 'Check-out time: $1'],
        [/^Atvyko: (.+)$/, 'Arrived: $1'],
        [/^Dirbtų valandų: (.+)$/, 'Hours worked: $1'],
        [/^Dabartinis el\. paštas: (.+)$/, 'Current email: $1'],
        [/^(-?[\d.]+) val\.$/, '$1 h'],
        [/^Klaida: ([\s\S]+)$/, (m, rest) => 'Error: ' + tr(rest)],
        [/^Klaida skenuojant: ([\s\S]+)$/, (m, rest) => 'Error while scanning: ' + tr(rest)],
        [/^Klaida skenuojant lipduko: ([\s\S]+)$/, (m, rest) => 'Error while scanning the label: ' + tr(rest)],
        [/^Klaida tikrinant kodą: ([\s\S]+)$/, (m, rest) => 'Error checking the code: ' + tr(rest)],
        [/^Klaida atnaujinant: ([\s\S]+)$/, 'Update error: $1'],
        [/^Klaida atnaujinant el\. paštą: ([\s\S]+)$/, 'Email update error: $1'],
        [/^ML kodas (.+) jau egzistuoja$/, 'ML code $1 already exists'],
        [/^Dažai su ML kodu (.+) nerasti$/, 'Paint with ML code $1 not found'],
        [/^Darbuotojas '(.+)' nerastas$/, "Employee '$1' not found"],
        [/^Nepavyko išskirti vardo ir pavardės$/, 'Could not extract first and last name'],
        [/^✅ (.+) pažymėtas kaip išvykęs$/, '✅ $1 marked as departed'],
        [/^⏳ Kodas dar negalioja\.\s*Šis kodas pradės galioti nuo: ([\s\S]+)$/,
            '⏳ The code is not valid yet.\n\nThis code will become valid from: $1'],
        [/^❌ Šio kodo galiojimo laikas pasibaigė: ([\s\S]+?)\s*Kodas nebegalioja ir netrukus bus automatiškai ištrintas iš sistemos\.$/,
            '❌ This code expired on: $1\n\nThe code is no longer valid and will be deleted from the system shortly.']
    ];

    function tr(core) {
        if (Object.prototype.hasOwnProperty.call(EXACT, core)) return EXACT[core];
        for (const [re, rep] of PATTERNS) {
            if (re.test(core)) return core.replace(re, rep);
        }
        return core;
    }

    const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
    const SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1 };

    function translateText(node) {
        const m = node.nodeValue.match(/^(\s*)([\s\S]*?)(\s*)$/);
        if (!m[2]) return;
        const out = tr(m[2]);
        if (out !== m[2]) node.nodeValue = m[1] + out + m[3];
    }

    function translateAttr(el, name) {
        const v = el.getAttribute(name);
        if (!v) return;
        const out = tr(v.trim());
        if (out !== v.trim()) el.setAttribute(name, out);
    }

    function translateNode(node) {
        if (node.nodeType === 3) {
            translateText(node);
            return;
        }
        if (node.nodeType !== 1 || SKIP_TAGS[node.tagName]) return;
        ATTRS.forEach(a => { if (node.hasAttribute(a)) translateAttr(node, a); });
        node.childNodes.forEach(translateNode);
    }

    translateNode(document.documentElement);

    new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.type === 'characterData') {
                if (m.target.nodeType === 3 && !SKIP_TAGS[m.target.parentNode && m.target.parentNode.tagName]) translateText(m.target);
            } else if (m.type === 'attributes') {
                translateAttr(m.target, m.attributeName);
            } else {
                m.addedNodes.forEach(translateNode);
            }
        }
    }).observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ATTRS
    });
})();
