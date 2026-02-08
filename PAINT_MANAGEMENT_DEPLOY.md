# Dažų Valdymo Edge Functions Deployment Instrukcija

## Apžvalga
Darbuotojų portale pridėta nauja funkcija - "Dažų Valdymas", kuri leidžia:
- Pridėti naujus dažus į `added_paints` lentelę
- Redaguoti esamų dažų parametrus (spalvą, blizgumą, paviršių, ir kt.)
- Keisti dažų kiekį (svorį/weight)
- Visi pakeitimai automatiškai logojami į `paint_changes` lentelę

## Edge Functions Sąrašas

### 1. `add-paint`
**Paskirtis**: Prideda naujus dažus į `added_paints` ir logoja į `paint_changes`

**Kelias**: `supabase/functions/add-paint/index.ts`

**Deploy komanda**:
```bash
supabase functions deploy add-paint --project-ref xyzttzqvbescdpihvyfu
```

**Request format**:
```json
{
  "ml_kodas": "ML241",
  "gamintojas": "Ripol",
  "kodas": "51LC7016",
  "spalva": "RAL7016",
  "pavirsus": "Smooth",
  "blizgumas": "Matt",
  "effect": "Normal",
  "sudetis": "Polyester",
  "gruntas": "X",
  "kiekis": 25,
  "kaina": 150.00
}
```

**Response**: `{ success: true, paint: {...}, message: "Dažai sėkmingai pridėti" }`

---

### 2. `update-paint`
**Paskirtis**: Atnaujina esamų dažų parametrus (ne kiekį) ir logoja į `paint_changes`

**Kelias**: `supabase/functions/update-paint/index.ts`

**Deploy komanda**:
```bash
supabase functions deploy update-paint --project-ref xyzttzqvbescdpihvyfu
```

**Request format** (bent vienas papildomas laukas reikalingas):
```json
{
  "ml_kodas": "ML241",
  "gamintojas": "EuroPolveri",
  "spalva": "RAL9005",
  "blizgumas": "High Gloss"
}
```

**Response**: `{ success: true, paint: {...}, message: "Dažai sėkmingai atnaujinti" }`

---

### 3. `update-paint-weight`
**Paskirtis**: Keičia dažų kiekį/svorį ir logoja į `paint_changes`

**Kelias**: `supabase/functions/update-paint-weight/index.ts`

**Deploy komanda**:
```bash
supabase functions deploy update-paint-weight --project-ref xyzttzqvbescdpihvyfu
```

**Request format**:
```json
{
  "ml_kodas": "ML241",
  "new_weight": 20
}
```

**Specialus atvejis**: Jei `new_weight = 0`, dažai ištrinami iš `added_paints` (bet log lieka `paint_changes`)

**Response**: `{ success: true, paint: {...}, old_weight: 25, new_weight: 20, message: "Dažų kiekis sėkmingai atnaujintas" }`

---

### 4. `get-all-paints-admin`
**Paskirtis**: Grąžina visus dažus iš `added_paints` (įskaitant gruntus) admin valdymui

**Kelias**: `supabase/functions/get-all-paints-admin/index.ts`

**Deploy komanda**:
```bash
supabase functions deploy get-all-paints-admin --project-ref xyzttzqvbescdpihvyfu
```

**Request**: GET request su `x-session-token` header

**Response**: `{ success: true, paints: [...], count: 42 }`

---

## Viso Deploy Procesas (Visos Funkcijos Iš Karto)

```bash
# 1. Navigate to project directory
cd e:\Users\Bart\Documents\FlutterProjects\miltegona.lt

# 2. Deploy all functions
supabase functions deploy add-paint --project-ref xyzttzqvbescdpihvyfu
supabase functions deploy update-paint --project-ref xyzttzqvbescdpihvyfu
supabase functions deploy update-paint-weight --project-ref xyzttzqvbescdpihvyfu
supabase functions deploy get-all-paints-admin --project-ref xyzttzqvbescdpihvyfu

# 3. Verify deployment in Supabase Dashboard
# Go to: Edge Functions → Check all 4 functions are listed
```

---

## Autentifikacija ir Saugumas

Visos funkcijos reikalauja:
- **Header**: `x-session-token` - sesijos token iš `darbuotoju_sesijos` lentelės
- **Validacija**: Tikrina ar sesija galiojanti (`expires_at > NOW()`)
- **Prieiga**: Naudoja `SUPABASE_SERVICE_ROLE_KEY` - gali bypass RLS

**Frontend session token gavimas**:
```javascript
const sessionToken = localStorage.getItem('session_token');
```

---

## Duomenų Schema

### `paint_changes` Lentelė
```sql
CREATE TABLE paint_changes (
    id BIGSERIAL PRIMARY KEY,
    ml_code TEXT NOT NULL,
    old_weight NUMERIC,        -- NULL = naujas dažas
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
```

### `added_paints` Lentelė (Dabar)
Visus laukus turi, įskaitant `ml_kodas` (UNIQUE)

---

## Frontend Failai

### 1. `darbuotojai/index.html`
- Pridėtas naujas tab "Dažų Valdymas"
- Du modalai: pridėjimui/redagavimui ir kiekio keitimui

### 2. `js/paint-management.js`
- JavaScript funkcijos darbui su Edge Functions
- Lentelės renderinimas, filtravimas, modalų valdymas

---

## Testing Checklist

Po deployment, patikrinkite:

1. **Pridėjimas**:
   - [ ] Galima pridėti naują dažą su visais laukais
   - [ ] ML kodas validuojamas (ML + skaičius)
   - [ ] Įrašas sukuriamas `added_paints` lentelėje
   - [ ] Įrašas sukuriamas `paint_changes` su `old_weight=0`

2. **Redagavimas**:
   - [ ] Galima pakeisti bet kurį parametrą (ne kiekį)
   - [ ] Įrašas atnaujinamas `added_paints`
   - [ ] Naujas log sukuriamas `paint_changes` (weight unchanged)

3. **Kiekio Keitimas**:
   - [ ] Galima pakeisti kiekį
   - [ ] Jei kiekis = 0, dažai ištrinami
   - [ ] `paint_changes` logojamas su `old_weight` → `new_weight`

4. **Sąrašas**:
   - [ ] Rodomi visi dažai lentelėje
   - [ ] Search filtras veikia
   - [ ] Visi veiksmai matomiatrodo teisingai

---

## Troubleshooting

### Klaida: "Missing session token"
**Sprendimas**: Darbuotojas neprisijungęs. Atsijungti ir vėl prisijungti.

### Klaida: "Invalid or expired session"
**Sprendimas**: Sesija pasibaigė. Atsijungti ir vėl prisijungti.

### Klaida: "ML kodas jau egzistuoja"
**Sprendimas**: Naudojamas ML kodas jau yra. Pasirinkti kitą.

### Klaida: "Failed to fetch paints"
**Sprendimas**: Patikrinti ar `get-all-paints-admin` funkcija deployed. Patikrinti edge function logs Supabase Dashboard.

---

## Pavyzdinis Workflow

1. Darbuotojas prisijungia prie `darbuotojai/` portalo
2. Paspaudžia "Dažų Valdymas" tab
3. Sistema automatiškai įkelia visus dažus per `get-all-paints-admin`
4. Darbuotojas gali:
   - Pridėti naujus dažus → `add-paint` → log į `paint_changes`
   - Redaguoti dažus → `update-paint` → log į `paint_changes`
   - Keisti kiekį → `update-paint-weight` → log į `paint_changes`

Visi pakeitimai matomi realiame laike ir logojami auditui.

---

## Links

- **Supabase Dashboard**: https://app.supabase.com/project/xyzttzqvbescdpihvyfu
- **Edge Functions**: https://app.supabase.com/project/xyzttzqvbescdpihvyfu/functions
- **Database**: https://app.supabase.com/project/xyzttzqvbescdpihvyfu/editor
- **Frontend**: https://miltegona.lt/darbuotojai/
