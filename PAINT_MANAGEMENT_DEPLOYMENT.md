# Dažų Valdymo Sistema - Deployment Dokumentacija

## Apžvalga
Darbuotojų portale pridėta nauja funkcija "Dažų Valdymas", leidžianti darbuotojams:
- Pridėti naujus dažus
- Redaguoti esamus dažus (visus parametrus)
- Keisti dažų kiekį/svorį
- Visi pakeitimai automatiškai logoojami į `paint_changes` lentelę

## Failų Struktūra

### Frontend
- `/darbuotojai/index.html` - Pridėtas naujas tab "Dažų Valdymas" su modal formomis
- `/js/paint-management.js` - Visa dažų valdymo logika
- `/js/darbuotojai.js` - Atnaujintas tab switching su dažų tab palaikymu

### Backend - Edge Functions
```
/supabase/functions/
  ├── add-paint/
  │   └── index.ts           - Prideda naujus dažus (kiekis > 0)
  ├── update-paint/
  │   └── index.ts           - Atnaujina dažų parametrus (ne kiekį)
  ├── update-paint-weight/
  │   └── index.ts           - Atnaujina tik kiekį (0 = delete)
  └── get-all-paints-admin/
      └── index.ts           - Grąžina visus dažus (su gruntais)
```

## Deployment Žingsniai

### 1. Supabase Paruošimas

#### a) Patikrinti Duomenų Bazės Schemas

Patikrinti ar egzistuoja lentelės:
```sql
-- Tikriname added_paints lentelę
SELECT * FROM added_paints LIMIT 1;

-- Tikriname paint_changes lentelę
SELECT * FROM paint_changes LIMIT 1;
```

Jei `paint_changes` neegzistuoja, sukurti:
```sql
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

-- Indexai performance
CREATE INDEX IF NOT EXISTS idx_paint_changes_ml_code ON paint_changes(ml_code);
CREATE INDEX IF NOT EXISTS idx_paint_changes_created_at ON paint_changes(created_at DESC);
```

#### b) RLS Policies

Paint changes lentelė turi būti prieinama tik per Edge Functions:
```sql
-- Enable RLS
ALTER TABLE paint_changes ENABLE ROW LEVEL SECURITY;

-- Deny direct access (tik SERVICE_ROLE_KEY gali)
CREATE POLICY "Deny all direct access to paint_changes" ON paint_changes
    FOR ALL USING (false);
```

`added_paints` lentelė:
```sql
-- Enable RLS jei dar neįjungta
ALTER TABLE added_paints ENABLE ROW LEVEL SECURITY;

-- Public read (per anon_key) - jau turėtų būti
CREATE POLICY IF NOT EXISTS "Allow public read access to added_paints" ON added_paints
    FOR SELECT USING (true);

-- Deny write (tik per Edge Functions su SERVICE_ROLE_KEY)
CREATE POLICY IF NOT EXISTS "Deny direct write to added_paints" ON added_paints
    FOR INSERT USING (false);

CREATE POLICY IF NOT EXISTS "Deny direct update to added_paints" ON added_paints
    FOR UPDATE USING (false);

CREATE POLICY IF NOT EXISTS "Deny direct delete from added_paints" ON added_paints
    FOR DELETE USING (false);
```

### 2. Deploy Edge Functions

#### Option A: Per Supabase Dashboard (Rekomenduojama)

1. Eikite į Supabase Dashboard → Edge Functions
2. Kiekvienai funkcijai:

**add-paint:**
- Click "New Function"
- Name: `add-paint`
- Paste code from `/supabase/functions/add-paint/index.ts`
- Deploy

**update-paint:**
- Click "New Function"
- Name: `update-paint`
- Paste code from `/supabase/functions/update-paint/index.ts`
- Deploy

**update-paint-weight:**
- Click "New Function"
- Name: `update-paint-weight`
- Paste code from `/supabase/functions/update-paint-weight/index.ts`
- Deploy

**get-all-paints-admin:**
- Click "New Function"
- Name: `get-all-paints-admin`
- Paste code from `/supabase/functions/get-all-paints-admin/index.ts`
- Deploy

#### Option B: Per Supabase CLI

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref xyzttzqvbescdpihvyfu

# Deploy all functions
supabase functions deploy add-paint
supabase functions deploy update-paint
supabase functions deploy update-paint-weight
supabase functions deploy get-all-paints-admin
```

### 3. Testuoti Edge Functions

#### Test add-paint
```bash
curl -X POST https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/add-paint \
  -H "Content-Type: application/json" \
  -H "x-session-token: YOUR_VALID_SESSION_TOKEN" \
  -d '{
    "ml_kodas": "ML999",
    "gamintojas": "Ripol",
    "kodas": "TEST123",
    "spalva": "RAL9005",
    "pavirsus": "Smooth",
    "blizgumas": "Matt",
    "effect": "Normal",
    "sudetis": "Polyester",
    "kiekis": 25
  }'
```

Turėtumėte gauti:
```json
{
  "success": true,
  "paint": { ... },
  "message": "Dažai sėkmingai pridėti"
}
```

#### Test get-all-paints-admin
```bash
curl -X GET https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/get-all-paints-admin \
  -H "Content-Type: application/json" \
  -H "x-session-token: YOUR_VALID_SESSION_TOKEN"
```

### 4. Frontend Deployment

Jei naudojate GitHub Pages (kaip dabar):

```bash
# Commit changes
git add .
git commit -m "Pridėta dažų valdymo sistema darbuotojams"
git push origin main
```

Failai automatiškai deploy'insis į miltegona.lt.

### 5. Testavimas Production'e

1. Eikite į https://miltegona.lt/darbuotojai/
2. Prisijunkite su darbuotojo kredencialais
3. Spustelėkite "Dažų Valdymas" tab
4. Testuokite:
   - ✅ Pridėti naujus dažus (ML999 test kodas)
   - ✅ Redaguoti parametrus
   - ✅ Keisti kiekį
   - ✅ Patikrinti ar logojasi į `paint_changes`

## Patikrinimo SQL

Po testavimo patikrinkite, ar veikia logging:

```sql
-- Paskutiniai pakeitimai
SELECT * FROM paint_changes 
ORDER BY created_at DESC 
LIMIT 10;

-- Konkretaus dažo istorija
SELECT 
    ml_code,
    old_weight,
    new_weight,
    created_at
FROM paint_changes 
WHERE ml_code = 'ML999'
ORDER BY created_at DESC;
```

## Saugumas

### Edge Functions
- ✅ Validuoja sesijos token (`x-session-token` header)
- ✅ Naudoja SERVICE_ROLE_KEY (ne anon_key)
- ✅ Patikrina darbuotojų sesijas per `darbuotoju_sesijos` lentelę
- ✅ CORS configured

### RLS
- ✅ `added_paints` - public read, write tik per Edge Functions
- ✅ `paint_changes` - visas prieiga tik per Edge Functions
- ✅ `darbuotoju_sesijos` - tik Edge Functions

## Troubleshooting

### Klaida: "Missing session token"
**Problema:** Nėra session token arba neteisingas header name.
**Sprendimas:** Patikrinti ar `localStorage.getItem('darbuotojai_session')` grąžina token.

### Klaida: "Invalid or expired session"
**Problema:** Sesijos token pasibaigęs arba neegzistuoja `darbuotoju_sesijos` lentelėje.
**Sprendimas:** Atsijungti ir prisijungti iš naujo.

### Klaida: "ML kodas jau egzistuoja"
**Problema:** Bandote pridėti dažus su ML kodu, kuris jau yra DB.
**Sprendimas:** Naudokite kitą ML kodą arba redaguokite esamą.

### Klaida: "Failed to load paints"
**Problema:** Edge Function ne deployed arba RLS blokuoja.
**Sprendimas:** 
1. Patikrinti ar Edge Function deployed: `supabase functions list`
2. Patikrinti logs: Supabase Dashboard → Edge Functions → Logs

## Edge Function URLs

Visi Edge Functions URL:
```
https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/add-paint
https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/update-paint
https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/update-paint-weight
https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/get-all-paints-admin
```

## Changelog

### 2026-02-08
- ✅ Sukurtos 4 naujos Edge Functions dažų valdymui
- ✅ Pridėtas "Dažų Valdymas" tab darbuotojų portale
- ✅ Pilna CRUD funkcionalybė su paint_changes logging
- ✅ UI su modal formomis ir paieška
- ✅ Integracija su egzistuojančia darbuotojų autentifikacija

## Kontaktai

Jei kyla problemų deployment'e:
- Patikrinti Supabase Dashboard → Edge Functions → Logs
- Patikrinti Browser Console (F12) klaidų
- Patikrinti Network tab HTTP responses

---

**SVARBU:** Po deployment patikrinti ar veikia test dažų pridėjimas ir logojimas į `paint_changes`!
