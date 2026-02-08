# 🎨 Dažų Valdymo Sistema - Deployment Instrukcija

## ⚠️ SVARBU PRIEŠ DEPLOY

Sistema veiks tik po to, kai bus **deployed visos 4 Edge Functions** į Supabase. Be jų frontend gaus `NetworkError`.

---

## 📋 Sukurtos Edge Functions

1. **add-paint** - Prideda naujus dažus
2. **update-paint** - Redaguoja dažų parametrus  
3. **update-paint-weight** - Keičia dažų kiekį
4. **get-all-paints-admin** - Grąžina visus dažus valdymui

---

## 🚀 Deploy Komandos

### Prerequisites
```bash
# 1. Įsitikinkite, kad turite Supabase CLI
supabase --version

# 2. Login į Supabase (jei dar neprisijungę)
supabase login

# 3. Navigate į projekto direktoriją
cd e:\Users\Bart\Documents\FlutterProjects\miltegona.lt
```

### Deploy Visos Funkcijos (Rekomenduojama)
```bash
# Deploy visas funkcijas vienu metu
supabase functions deploy add-paint --project-ref xyzttzqvbescdpihvyfu
supabase functions deploy update-paint --project-ref xyzttzqvbescdpihvyfu  
supabase functions deploy update-paint-weight --project-ref xyzttzqvbescdpihvyfu
supabase functions deploy get-all-paints-admin --project-ref xyzttzqvbescdpihvyfu
```

### Verify Deployment
```bash
# List all deployed functions
supabase functions list --project-ref xyzttzqvbescdpihvyfu
```

**Arba patikrinkite Supabase Dashboard:**
https://app.supabase.com/project/xyzttzqvbescdpihvyfu/functions

---

## 🔍 Testing po Deploy

### 1. Test get-all-paints-admin
```bash
curl -X GET https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/get-all-paints-admin \
  -H "x-session-token: YOUR_SESSION_TOKEN"
```

### 2. Test add-paint
```bash
curl -X POST https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/add-paint \
  -H "Content-Type: application/json" \
  -H "x-session-token: YOUR_SESSION_TOKEN" \
  -d '{
    "ml_kodas": "ML999",
    "gamintojas": "Ripol",
    "kodas": "TEST001",
    "spalva": "RAL9999",
    "pavirsus": "Smooth",
    "blizgumas": "Matt",
    "effect": "Normal",
    "sudetis": "Polyester",
    "kiekis": 10
  }'
```

### 3. Frontend Test
1. Atidarykite: https://miltegona.lt/darbuotojai/
2. Prisijunkite su darbuotojo kredentialais
3. Paspauskite "Dažų Valdymas" tab
4. Turėtumėte matyti dažų lentelę (jei yra bent vienas dažas)

---

## 🐛 Troubleshooting

### Klaida: "NetworkError when attempting to fetch resource"
**Priežastis**: Edge funkcijos dar nedeployed

**Sprendimas**:
```bash
# Deploy visas funkcijas kaip aprašyta aukščiau
supabase functions deploy add-paint --project-ref xyzttzqvbescdpihvyfu
# ... (kitos)
```

### Klaida: "redeclaration of const EDGE_FUNCTIONS_URL"
**Priežastis**: Abu JavaScript failai deklaruoja tą pačią konstantą

**Sprendimas**: ✅ **JAU PATAISYTA** - paint-management.js dabar naudoja globalią EDGE_FUNCTIONS_URL iš darbuotojai.js

### Klaida: "Missing session token"
**Priežastis**: Darbuotojas neprisijungęs arba sesija pasibaigė

**Sprendimas**: 
- Atsijungti ir vėl prisijungti
- Patikrinti ar `localStorage.getItem('darbuotojai_session')` grąžina token

### Klaida: "Invalid or expired session"
**Priežastis**: Sesijos laikas pasibaigė (tikrinamas `darbuotoju_sesijos.expires_at`)

**Sprendimas**: Atsijungti ir vėl prisijungti

### Klaida: "ML kodas jau egzistuoja"
**Priežastis**: Bandoma pridėti dažus su jau esamu ML kodu

**Sprendimas**: Naudoti unikalų ML kodą (pvz., ML242, ML243, etc.)

### Edge Function Errors
**Patikrinkite logs**:
1. Eikite į: https://app.supabase.com/project/xyzttzqvbescdpihvyfu/functions
2. Pasirinkite funkciją
3. Peržiūrėkite "Logs" skiltį

---

## 📊 Database Schema

### Lentelės Reikalingos Sistemai

#### 1. `added_paints`
Jau egzistuoja - saugo dabartinį dažų inventorių
```sql
-- Columns: ml_kodas (UNIQUE), gamintojas, kodas, spalva, 
-- pavirsus, blizgumas, effect, sudetis, gruntas, kiekis, kaina
```

#### 2. `paint_changes`
**SVARBU**: Turi būti sukurta prieš naudojant sistemą

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

CREATE INDEX IF NOT EXISTS idx_paint_changes_ml_code ON paint_changes(ml_code);
CREATE INDEX IF NOT EXISTS idx_paint_changes_created_at ON paint_changes(created_at DESC);
```

**Sukūrimo būdas**:
1. Eikite į: https://app.supabase.com/project/xyzttzqvbescdpihvyfu/editor
2. Atidarykite SQL Editor
3. Įklijuokite aukščiau esantį SQL
4. Paleiskite (Run)

#### 3. `darbuotoju_sesijos`
Jau egzistuoja - autentifikacijai

---

## 📁 Failų Struktūra

```
miltegona.lt/
├── darbuotojai/
│   └── index.html               ✅ Atnaujinta (naujas tab)
├── js/
│   ├── darbuotojai.js          ✅ Egzistuoja
│   └── paint-management.js     ✅ Naujas failas
├── supabase/functions/
│   ├── add-paint/
│   │   └── index.ts            ✅ Naujas
│   ├── update-paint/
│   │   └── index.ts            ✅ Naujas
│   ├── update-paint-weight/
│   │   └── index.ts            ✅ Naujas
│   └── get-all-paints-admin/
│       └── index.ts            ✅ Naujas
└── PAINT_MANAGEMENT_DEPLOY.md  📘 Dokumentacija
```

---

## ✅ Deployment Checklist

- [ ] **1. Database Setup**
  - [ ] Sukurta `paint_changes` lentelė
  - [ ] Sukurti indeksai

- [ ] **2. Deploy Edge Functions**
  - [ ] `add-paint` deployed
  - [ ] `update-paint` deployed
  - [ ] `update-paint-weight` deployed
  - [ ] `get-all-paints-admin` deployed

- [ ] **3. Frontend Deployment**
  - [ ] `darbuotojai/index.html` updated (naujas tab)
  - [ ] `js/paint-management.js` uploaded
  - [ ] `js/darbuotojai.js` has tab handling

- [ ] **4. Testing**
  - [ ] Prisijungimas veikia
  - [ ] "Dažų Valdymas" tab matomas
  - [ ] Dažų sąrašas užsikrauna
  - [ ] Pridėjimas veikia
  - [ ] Redagavimas veikia
  - [ ] Kiekio keitimas veikia
  - [ ] `paint_changes` lentelėje matomi pakeitimai

---

## 🔗 Naudingos Nuorodos

- **Frontend**: https://miltegona.lt/darbuotojai/
- **Supabase Dashboard**: https://app.supabase.com/project/xyzttzqvbescdpihvyfu
- **Edge Functions**: https://app.supabase.com/project/xyzttzqvbescdpihvyfu/functions
- **Database Editor**: https://app.supabase.com/project/xyzttzqvbescdpihvyfu/editor
- **SQL Editor**: https://app.supabase.com/project/xyzttzqvbescdpihvyfu/sql

---

## 💡 Patarimai

1. **Visada deploy'inkite visas funkcijas kartu** - jos tarpusavyje susietos
2. **Testuokite lokalioje aplinkoje** su Live Server prieš deployment į produkciją
3. **Monitoring** - periodiškai tikrinkite Edge Function logs dėl klaidų
4. **Backup** - prieš didelius pakeitimus darykite `paint_changes` lentelės backup

---

## 📞 Support

Jei kyla klausimų ar problemų:
1. Patikrinkite Edge Functions logs
2. Patikrinkite Browser Console (F12)
3. Peržiūrėkite šį dokumentą

**Sukurta**: 2026-02-08
**Versija**: 1.0
