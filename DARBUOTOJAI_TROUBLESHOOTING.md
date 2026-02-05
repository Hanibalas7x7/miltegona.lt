# Darbuotojų Portalo Troubleshooting Guide

## Dažniausios Klaidos ir Sprendimai

### "Įvyko klaida. Bandykite vėliau."

Ši klaida gali reikšti kelis dalykus. Tikrinkite po vieną:

#### 1. Edge Functions Nėra Deployed

**Problema**: Edge Functions dar neįdiegtos arba neteisingas pavadinimas.

**Patikrinimas**:
1. Eiti į Supabase Dashboard
2. Edge Functions meniu
3. Patikrinti ar yra visos 4 funkcijos:
   - `darbuotojai-login`
   - `darbuotojai-validate-session`
   - `darbuotojai-suvestine`
   - `darbuotojai-atlyginimai`

**Sprendimas**:
```
Dashboard → Edge Functions → New Function

Kiekvienai funkcijai:
1. Sukurti naują funkciją su tiksliu pavadinimu (pvz: darbuotojai-login)
2. Nukopijuoti kodą iš supabase/functions/darbuotojai-login/index.ts
3. Deploy
```

#### 2. CORS Klaida (Network Error)

**Patikrinimas**: Atidarykite Browser Developer Tools:
- Chrome/Edge: F12 arba Ctrl+Shift+I
- Firefox: F12
- Safari: Cmd+Option+I

Console tab'e ieškokite:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Sprendimas**: Patikrinti kad Edge Function kodas turi CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Kiekviename response
return new Response(
  JSON.stringify({...}),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

#### 3. 404 Not Found - Funkcija Nerasta

**Console error**:
```
POST https://....supabase.co/functions/v1/darbuotojai-login 404
```

**Sprendimas**:
- Patikrinti funkcijos pavadinimą Dashboard'e
- Funkcijos pavadinimas turi būti tiksliai: `darbuotojai-login` (su brūkšneliu)
- Ne: `darbuotojai_login` ar `darbuotojaiLogin`

#### 4. 500 Internal Server Error

**Console error**:
```
POST https://....supabase.co/functions/v1/darbuotojai-login 500
```

**Sprendimas**:
- Eiti į Dashboard → Edge Functions → darbuotojai-login → Logs
- Peržiūrėti error logs
- Dažniausiai: trūksta SUPABASE_SERVICE_ROLE_KEY environment variable
- Supabase automatiškai prideda šias environment variables, bet jei ne:
  - Dashboard → Settings → API → service_role key (secret)
  - Dashboard → Edge Functions → Environment Variables

#### 5. Invalid Credentials / 401 Unauthorized

**Console response**:
```json
{
  "error": "Neteisingas el. paštas arba slaptažodis"
}
```

**Sprendimas**:
1. Patikrinti ar darbuotojas turi paskyrą:
   - Tabelis app → Darbuotojai → Paskyros stulpelis
   - Arba Supabase Dashboard → Authentication → Users
2. Bandyti iš naujo sukurti paskyrą per tabelis app
3. Patikrinti ar `app_users` lentelėje yra įrašas su:
   - `role = 'employee'`
   - `darbuotojas_id` atitinka darbuotoją

#### 6. localStorage Nepalaiko HTTPS

**Problema**: Testuojate per `file://` protokolą arba `http://` (ne HTTPS).

**Sprendimas**:
- GitHub Pages automatiškai naudoja HTTPS
- Vietiniam testavimui naudoti live server su HTTPS arba:
```bash
# Python simple server
python -m http.server 8000
# Tada eiti į http://localhost:8000/darbuotojai/
```

## Debug Mode

Pridėkite papildomą logging į `js/darbuotojai.js`:

```javascript
// handleLogin funkcijoje po try
try {
    console.log('Bandoma prisijungti su:', email); // PRIDĖTI
    
    const response = await fetch(`${EDGE_FUNCTIONS_URL}/darbuotojai-login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
    });
    
    console.log('Response status:', response.status); // PRIDĖTI
    console.log('Response ok:', response.ok); // PRIDĖTI
    
    const data = await response.json();
    console.log('Response data:', data); // PRIDĖTI
    
    // ...
}
```

## Greitas Edge Function Test

Testuoti edge function tiesiogiai per curl:

```bash
curl -X POST \
  https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/darbuotojai-login \
  -H "Content-Type: application/json" \
  -d '{"email":"darbuotojas@example.com","password":"test123"}'
```

Turėtų grąžinti:
- 404 → Funkcija nėra deployed
- 401 → Funkcija veikia, bet neteisingi credentials
- 200 + JSON → Viskas veikia!

## Checklist Prieš Testavimą

- [ ] Edge Functions deployed (visos 4)
- [ ] EDGE_FUNCTIONS_URL teisingai js/darbuotojai.js
- [ ] Darbuotojas sukurtas per tabelis app su paskyra
- [ ] app_users lentelėje role = 'employee'
- [ ] darbuotojas_id susietas su darbuotojai lentelės įrašu
- [ ] RLS policies įjungtos (tabelis schema įvykdyta)
- [ ] Testuojama per HTTPS (GitHub Pages) arba localhost

## Supabase Dashboard Quick Links

1. **Edge Functions**: https://app.supabase.com/project/xyzttzqvbescdpihvyfu/functions
2. **Logs**: https://app.supabase.com/project/xyzttzqvbescdpihvyfu/logs/edge-functions
3. **Authentication Users**: https://app.supabase.com/project/xyzttzqvbescdpihvyfu/auth/users
4. **Database Tables**: https://app.supabase.com/project/xyzttzqvbescdpihvyfu/editor

## Reikalinga Pagalba?

Jei vis dar neveikia:
1. Nukopijuoti **tikslią** klaidos pranešimą iš browser console
2. Nukopijuoti response body (jei yra)
3. Patikrinti Edge Function logs Dashboard'e
4. Pridėti console.log ir išsiųsti output

---

**Patarimų**: Dažniausiai problema yra paprasta - Edge Functions nedeployed arba neteisingas function name. Pradėkite nuo ten!
