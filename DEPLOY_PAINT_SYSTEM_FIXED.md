# Dažų Valdymo Sistemos Įdiegimo Instrukcijos

## AUTHENTICATION FIX APPLIED ✓
**SVARBU:** Visos paint funkcijos dabar naudoja JWT token authentication (kaip darbuotojai-suvestine), nebereikia `darbuotoju_sesijos` lentelės.

## PAINT_CHANGES SCHEMA MATCH ✓
**SVARBU:** Visos funkcijos saugo **pilną snapshot** į `paint_changes` lentelę (kaip Miltegona_Manager Flutter app):
- `gamintojas` - **NOT NULL** (privalomas laukas)
- Visi kiti laukai (kodas, spalva, gruntas, etc.) - nullable
- Kiekvienas pakeitimas = pilnas dažo objekto snapshot su old_weight → new_weight

## 1. Sukurti `paint_changes` Lentelę

### 1.1 Atidarykite Supabase SQL Editor
1. Eikite į [Supabase Dashboard](https://app.supabase.com)
2. Pasirinkite projektą `xyzttzqvbescdpihvyfu`
3. Kairėje pusėje spauskite **SQL Editor**

### 1.2 Įvykdykite SQL
Nukopijuokite ir įvykdykite `supabase/migrations/create_paint_changes.sql`:

```sql
-- Paint Changes Table for Logging All Paint Operations

CREATE TABLE IF NOT EXISTS paint_changes (
    id BIGSERIAL PRIMARY KEY,
    ml_code TEXT NOT NULL,
    old_weight NUMERIC,
    new_weight NUMERIC NOT NULL,
    gamintojas TEXT,
    kodas TEXT,
    spalva TEXT,
    gruntas TEXT,
    blizgumas TEXT,
    pavirsus TEXT,
    effect TEXT,
    sudetis TEXT,
    kaina NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paint_changes_ml_code ON paint_changes(ml_code);
CREATE INDEX IF NOT EXISTS idx_paint_changes_created_at ON paint_changes(created_at DESC);

SELECT 'paint_changes table created successfully!' as status;
```

### 1.3 Patikrinkite Rezultatą
Turėtumėte pamatyti:
```
status: "paint_changes table created successfully!"
```

---

## 2. Deploy Edge Functions

### 2.1 Prisijunkite prie Supabase CLI
```bash
cd "e:\Users\Bart\Documents\FlutterProjects\miltegona.lt"
supabase login
```

### 2.2 Deploy Visas 4 Paint Funkcijas
```bash
# Deploy add-paint function
supabase functions deploy add-paint --project-ref xyzttzqvbescdpihvyfu

# Deploy update-paint function
supabase functions deploy update-paint --project-ref xyzttzqvbescdpihvyfu

# Deploy update-paint-weight function
supabase functions deploy update-paint-weight --project-ref xyzttzqvbescdpihvyfu

# Deploy get-all-paints-admin function
supabase functions deploy get-all-paints-admin --project-ref xyzttzqvbescdpihvyfu
```

### 2.3 Patikrinkite Deployment Status
Turėtumėte pamatyti kiekvienai funkcijai:
```
✓ Deployed function add-paint
✓ Deployed function update-paint
✓ Deployed function update-paint-weight
✓ Deployed function get-all-paints-admin
```

---

## 3. Testavimas Prieš GitHub Commit

### 3.1 Test Darbuotojai Suvestine
Atidarykite `test-darbuotojai-suvestine.html` naršyklėje:
```bash
start test-darbuotojai-suvestine.html
```

1. Įveskite darbuotojo email ir slaptažodį
2. Spauskite **"1. Login"**
3. Turėtumėte pamatyti:
   - ✓ Login Successful!
   - Token: eyJhb...
   - User: { id, darbuotojasId, vardas, pavarde, email }

4. Pasirinkite metai/mėnuo
5. Spauskite **"2. Load Suvestine"**
6. Turėtumėte pamatyti darbo valandų suvestinę

**REZULTATAS:** Jei tai veikia, tai `darbuotojai-login` ir JWT authentication veikia teisingai.

### 3.2 Test Paint Functions
Atidarykite `test-paint-functions.html` naršyklėje:
```bash
start test-paint-functions.html
```

1. Įveskite darbuotojo credentials
2. Spauskite **"1. Login"** - turėtų būti ✓ Login Successful
3. Spauskite **"2. Get All Paints"** - turėtų parodyti dažų sąrašą
4. Užpildykite paint form ir spauskite **"3. Add Paint"** - turėtų pridėti dažą
5. Atnaujinkite svorį ir spauskite **"4. Update Weight"** - turėtų atnaujinti kiekį

### 3.3 Test Full Darbuotojai Portal
Atidarykite darbuotojų portalą:
```bash
start darbuotojai/index.html
```

1. **Login:**
   - Įveskite employee credentials
   - Spauskite **Prisijungti**
   - Turėtumėte patekti į dashboard

2. **Mėnesio Suvestinė Tab:**
   - Turėtumėte matyti darbo valandas
   - Jei klaida, patikrinkite browser console (F12)

3. **Dažų Valdymas Tab:**
   - Spauskite **"Dažų Valdymas"** tab
   - Turėtumėte pamatyti dažų lentelę
   - Mėginkite:
     - ✓ Search paieška
     - ✓ Pridėti naują dažą (Pridėti Dažą mygtukas)
     - ✓ Redaguoti dažą (✏️ ikonėlė)
     - ✓ Atnaujinti svorį (⚖️ ikonėlė)

### 3.4 Patikrinkite Pakeitimų Logus
Supabase SQL Editor:
```sql
-- Pažiūrėti paskutinius 10 pakeitimų
SELECT * FROM paint_changes 
ORDER BY created_at DESC 
LIMIT 10;
```

Turėtumėte matyti:
- Naujų dažų pridėjimus (old_weight = 0)
- Dažų atnaujinimus
- Svorio pakeitimus (old_weight → new_weight)

---

## 4. Commit į GitHub

### 4.1 Patikrinkite Pakeitimus
```bash
git status
```

### 4.2 Add Files
```bash
git add supabase/functions/add-paint/
git add supabase/functions/update-paint/
git add supabase/functions/update-paint-weight/
git add supabase/functions/get-all-paints-admin/
git add supabase/migrations/create_paint_changes.sql
git add darbuotojai/index.html
git add js/paint-management.js
git add js/darbuotojai.js
git add test-paint-functions.html
git add test-darbuotojai-suvestine.html
git add DEPLOY_PAINT_SYSTEM_FIXED.md
```

### 4.3 Commit
```bash
git commit -m "Pridėta dažų valdymo sistema su CRUD ir JWT authentication

- 4 naujos Edge Functions: add-paint, update-paint, update-paint-weight, get-all-paints-admin
- Naudoja JWT token authentication (Authorization: Bearer) kaip darbuotojai-suvestine
- paint_changes lentelė visų pakeitimų logui
- Dažų Valdymas tab darbuotojų portale
- Test puslapiai: test-paint-functions.html, test-darbuotojai-suvestine.html
- Dokumentacija: DEPLOY_PAINT_SYSTEM_FIXED.md"
```

### 4.4 Push
```bash
git push origin main
```

---

## 5. Post-Deployment Verification

### 5.1 Production Test
1. Atidarykite live darbuotojai portal: `https://miltegona.lt/darbuotojai/`
2. Prisijunkite su employee credentials
3. Pereikite į "Dažų Valdymas" tab
4. Išbandykite visas funkcijas

### 5.2 Check Paint Changes Log
```sql
SELECT 
    ml_code,
    old_weight,
    new_weight,
    (new_weight - COALESCE(old_weight, 0)) as weight_change,
    created_at
FROM paint_changes
ORDER BY created_at DESC
LIMIT 20;
```

### 5.3 Monitor Edge Function Logs
Supabase Dashboard → Edge Functions:
- Patikrinkite kiekvienos funkcijos logs
- Ieškokite error messages
- Stebėkite response times

---

## Funkcijų Apžvalga

### Authentication
- **Metodas:** JWT Token (Supabase Auth)
- **Header:** `Authorization: Bearer <token>`
- **Token šaltinis:** `darbuotojai-login` funkcija
- **Validacija:** `supabase.auth.getUser(token)`

### Edge Functions
1. **add-paint** - Pridėti naują dažą
   - POST `/add-paint`
   - Body: paint objektas su 11 laukų
   - Logs: old_weight = 0 → new_weight

2. **update-paint** - Redaguoti dažą (ne svorį)
   - POST `/update-paint`
   - Body: paint objektas + ml_kodas
   - Logs: nekinta weight

3. **update-paint-weight** - Atnaujinti svorį
   - POST `/update-paint-weight`
   - Body: { ml_kodas, new_weight }
   - Logs: old_weight → new_weight
   - Jei new_weight = 0, DELETE dažą

4. **get-all-paints-admin** - Gauti visus dažus
   - GET `/get-all-paints-admin`
   - Returns: { paints: [...] }
   - Includes gruntas=true

### Database Tables
- **added_paints:** Dažų inventorius (primary key: ml_kodas)
- **paint_changes:** Visų operacijų log (id, ml_code, old_weight, new_weight, created_at, ...)

---

## Troubleshooting

### Klaida: "Authorization header privalomas"
**Priežastis:** Nėra JWT token arba neteisingas header  
**Sprendimas:** Patikrinkite ar `localStorage.getItem('darbuotojai_session')` turi token

### Klaida: "Invalid or expired token"
**Priežastis:** Token pasibaigęs arba neteisingas  
**Sprendimas:** Atsijunkite ir prisijunkite iš naujo

### Klaida: "Failed to load paints"
**Priežastis:** Edge funkcija ne deployed arba duomenų bazės klaida  
**Sprendimas:** 
1. Patikrinkite ar funkcija deployed: `supabase functions list`
2. Pažiūrėkite Edge Function logs Supabase Dashboard

### Klaida: "paint_changes table does not exist"
**Priežastis:** Lentelė nesukurta  
**Sprendimas:** Įvykdykite `create_paint_changes.sql` Supabase SQL Editor

### Console Error: "NetworkError when attempting to fetch"
**Priežastis:** CORS arba funkcija neveikia  
**Sprendimas:**
1. Patikrinkite Edge Function status
2. Pažiūrėkite Network tab (F12) - ar endpoint teisingas
3. Patikrinkite ar CORS headers teisingi funkcijoje

---

## Sekantys Žingsniai (Ateityje)

1. **Rate Limiting:** Pridėti rate limiting paint operacijoms
2. **User Tracking:** Loginti kuris darbuotojas padarė pakeitimą
3. **Undo Function:** Galimybė atšaukti paskutinį pakeitimą
4. **Export Paint Changes:** Excel atsisiuntimas su visais pakeitimais
5. **Notifications:** Email/SMS pranešimai kai dažų kiekis žemas

---

## Support

Jei kiltų problemų:
1. Patikrinkite Browser Console (F12)
2. Pažiūrėkite Supabase Edge Function Logs
3. Užeikite į SQL Editor ir patikrinkite database tables
4. Test su `test-paint-functions.html` lokaliai

**SVARBU:** Visos funkcijos dabar naudoja tą patį JWT authentication kaip darbuotojai-suvestine, todėl autentikacija turėtų veikti be problemų!
