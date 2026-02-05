# Darbuotojų Portalo Įdiegimo Instrukcija

## Apžvalga
Darbuotojų portalas leidžia darbuotojams prisijungti su el. paštu ir slaptažodžiu bei matyti:
- Savo mėnesio darbo valandų suvestines
- Savo mėnesio atlyginimus

**Saugumas**: Nenaudojamas anon_key kliento kode - visi duomenys gaunami per Edge Functions su SERVICE_ROLE_KEY.

## Failų Struktūra

### Frontend (HTML/CSS/JS)
```
/darbuotojai/
  └── index.html          - Pagrindinis puslapis (login + dashboard)
/css/
  └── darbuotojai.css     - Stiliai
/js/
  └── darbuotojai.js      - Kliento logika
```

### Backend (Edge Functions)
```
/supabase/functions/
  ├── darbuotojai-login/
  │   └── index.ts        - Autentifikacija
  ├── darbuotojai-validate-session/
  │   └── index.ts        - Sesijos validacija
  ├── darbuotojai-suvestine/
  │   └── index.ts        - Darbo valandų duomenys
  └── darbuotojai-atlyginimai/
      └── index.ts        - Atlyginimų duomenys
```

## Įdiegimo Žingsniai

### 1. Atnaujinti JavaScript Konfigūraciją

Redaguoti `js/darbuotojai.js` ir pakeisti:
```javascript
const EDGE_FUNCTIONS_URL = 'https://YOUR_PROJECT_ID.supabase.co/functions/v1';
```

Į savo Supabase projekto URL (tą patį kaip tabelis app naudoja).

### 2. Įdiegti Edge Functions

Supabase Dashboard → Edge Functions → Deploy kiekvieną funkciją:

#### a) darbuotojai-login
- Funkcijos pavadinimas: `darbuotojai-login`
- Kodas: `supabase/functions/darbuotojai-login/index.ts`
- Aprašymas: Employee authentication

#### b) darbuotojai-validate-session
- Funkcijos pavadinimas: `darbuotojai-validate-session`
- Kodas: `supabase/functions/darbuotojai-validate-session/index.ts`
- Aprašymas: Session validation

#### c) darbuotojai-suvestine
- Funkcijos pavadinimas: `darbuotojai-suvestine`
- Kodas: `supabase/functions/darbuotojai-suvestine/index.ts`
- Aprašymas: Get employee work hours

#### d) darbuotojai-atlyginimai
- Funkcijos pavadinimas: `darbuotojai-atlyginimai`
- Kodas: `supabase/functions/darbuotojai-atlyginimai/index.ts`
- Aprašymas: Get employee salary

### 3. Įkelti į GitHub Pages

```bash
git add .
git commit -m "Pridėtas darbuotojų portalas"
git push
```

### 4. Testuoti

Eiti į: `https://jūsų-domenas.lt/darbuotojai/`

Prisijungti su darbuotojo credentials (sukurtais tabelis app).

## Funkcionalumas

### Login Screen
- El. pašto ir slaptažodžio laukai
- Validacija (6+ simbolių slaptažodis)
- Klaidos pranešimai
- Sesijos saugojimas localStorage (access token)

### Dashboard
- 2 skirtukai: Mėnesio Suvestinė ir Mėnesio Atlyginimai
- Mėnesio navigacija (praeitas/kitas mėnuo)
- Atsijungimo mygtukas

### Mėnesio Suvestinė
- Lentelė su visomis dienomis:
  - Data
  - Pradžios laikas
  - Pabaigos laikas
  - Pietų pertrauka
  - Valandos
- Iš viso valandų per mėnesį

### Mėnesio Atlyginimai
- Kortelė su informacija:
  - Dirbtos valandos
  - Įkainis (€/val.)
  - Premija
  - Avansas
  - IŠ VISO MOKĖTI

## Saugumas

### ✅ Kas yra saugus:
- Nėra anon_key kliento kode
- Visi duomenys per Edge Functions su SERVICE_ROLE_KEY
- RLS policies apsaugo duomenų bazę
- Darbuotojai mato tik savo duomenis
- Sesijos tokenas (JWT) saugomas localStorage
- CORS headiniai tinkamai sukonfigūruoti

### ⚠️ Papildomi patobulinimai (rekomenduojami):
- Rate limiting Edge Functions (60 requests/hour per IP) - kaip kontrolės panelėje
- Sesijos galiojimo laikas su automatine logout
- Password reset funkcionalumas
- Two-factor authentication
- HTTPS privalomas production aplinkoje

## Troubleshooting

### Neprisijungia
1. Patikrinti ar Edge Functions deployed
2. Patikrinti EDGE_FUNCTIONS_URL js/darbuotojai.js
3. Patikrinti browser console errors
4. Patikrinti ar darbuotojas turi `role = 'employee'` app_users lentelėje

### Nerodo duomenų
1. Patikrinti ar darbuotojas turi `darbuotojas_id` app_users lentelėje
2. Patikrinti ar yra darbo valandų duomenų tame mėnesyje
3. Patikrinti RLS policies darbuotoju_darbo_valandos lentelėje

### CORS klaidos
1. Patikrinti ar Edge Functions turi CORS headers
2. Patikrinti ar OPTIONS request grąžina 'ok'
3. Patikrinti ar Access-Control-Allow-Origin yra '*'

## Integracija su Tabelis App

Darbuotojų portalas naudoja **TĄ PAČIĄ** Supabase duomenų bazę kaip tabelis Flutter aplikacija:

- **app_users** - autentifikacijos lentelė su role
- **darbuotojai** - darbuotojų informacija
- **darbuotoju_darbo_valandos** - darbo valandų įrašai
- **premijos** - premijų duomenys
- **avansai** - avansų duomenys

### Darbuotojo sukūrimas:
1. Tabelis app → Direktorius prisijungia
2. Darbuotojai screen → Pridėti darbuotoją
3. Sukurti darbuotojo paskyrą → įvesti email ir slaptažodį
4. Darbuotojas gali prisijungti į portalą su tais pačiais credentials

## Naudingi Linkai

- Tabelis GitHub: https://github.com/Hanibalas7x7/tabelis
- Supabase Dashboard: https://app.supabase.com/
- Edge Functions docs: https://supabase.com/docs/guides/functions

## Versija
v1.0.0 - 2026-02-03
- Pradinis release
- Login su email/password
- Mėnesio suvestinės peržiūra
- Mėnesio atlyginimų peržiūra
