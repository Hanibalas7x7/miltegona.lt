# Vartų Kontrolės Sistema

## Apžvalga

Sistema leidžia generuoti laikinus kodus vartų atidarymui su galiojimo laiko valdymu.

## Puslapiai

### 1. `/kontrole/` - Administravimo Panelė
- **Prieiga**: Apsaugota slaptažodžiu (saugoma Supabase)
- **Funkcijos**:
  - Generuoti 8 simbolių kodus
  - Nustatyti galiojimo laiką:
    - Konkreti diena
    - Datų intervalas
    - Neribotai
  - Peržiūrėti aktyvius kodus
  - Filtruoti kodus (visi/aktyvūs/pasibaigę)
  - Dalintis kodų nuorodomis
  - Ištrinti kodus

### 2. `/atidaryti/` - Vartų Atidarymas
- **Prieiga**: Publika su kodu
- **Funkcijos**:
  - Kodo validavimas
  - Vartų atidarymo komandos siuntimas
  - Galiojimo laiko tikrinimas

## Supabase Lentelės

### 1. `control_password`
Saugo kontrolės panelės slaptažodį
```sql
- id (UUID)
- password (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 2. `gate_codes`
Saugo sugeneruotus vartų prieigos kodus su galiojimo laiku
```sql
- id (UUID)
- code (VARCHAR(8)) - unikalus 8 simbolių kodas
- valid_from (TIMESTAMP) - galioja nuo
- valid_to (TIMESTAMP) - galioja iki
- unlimited (BOOLEAN) - ar galioja neribotai
- note (TEXT) - pastaba (pvz., kliento vardas)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 3. `gate_commands` (ESAMA LENTELĖ - NELIEČIAMA)
Komandų siuntimui į įrenginius. Ši lentelė jau egzistuoja ir naudojama kitų aplikacijų.
```sql
- id (BIGINT)
- command (TEXT) - komandos tipas ('open_gate', 'send_sms')
- user_id (UUID)
- created_at (TIMESTAMP)
- executed_at (TIMESTAMP)
- status (TEXT) - 'pending', 'completed', 'failed'
- response (TEXT)
- phone_number (VARCHAR(20))
- sms_message (TEXT)
- order_code (VARCHAR(5)) - naudojama užsakymų sekimui (ne vartų kodams!)
- sms_type (VARCHAR(50))
- device_id (TEXT) - įrenginio ID ('gate_opener_1', 'default')
```

**Pastaba**: `order_code` yra 5 simboliai ir naudojamas užsakymų sekimui (SMS). Vartų kodai saugomi atskiroje `gate_codes` lentelėje ir NĖRA įrašomi į `gate_commands`.

## Diegimas

### 1. Sukurti Supabase lenteles
1. Eiti į Supabase projekto SQL Editor
2. Paleisti `supabase-schema.sql` failą
3. Pakeisti default slaptažodį lentelėje `control_password`

### 2. Patikrinti Supabase konfigūraciją
Faile `/js/kontrole.js` ir `/js/atidaryti.js`:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### 3. Paleisti sistemą
- Kontrolės panelė: `https://miltegona.lt/kontrole/`
- Default slaptažodis: `admin123` (pakeisti po diegimo!)

## Naudojimas

### Kodų Generavimas
1. Prisijungti prie `/kontrole/` su slaptažodžiu
2. Pasirinkti galiojimo tipą:
   - **Konkreti diena**: Kodas galioja tik tą dieną
   - **Datų intervalas**: Kodas galioja tarp dviejų datų
   - **Neribotai**: Kodas galioja be laiko apribojimo
3. Pridėti pastabą (neprivaloma)
4. Spausti "Generuoti Kodą"
5. Kopijuoti kodą arba nuorodą
6. Dalintis nuoroda su klientu

### Vartų Atidarymas
1. Klientas atidaro nuorodą: `https://miltegona.lt/atidaryti/?code=XXXXXXXX`
2. Sistema tikrina kodo galiojimą
3. Jei kodas galioja, rodomas mygtukas "Atidaryti Vartus"
4. Paspaudus mygtuką, komanda siunčiama į `gate_commands` lentelę
5. Sistema (ne šis puslapis) skaito `gate_commands` ir atidaro vartus

## Saugumas

- Kontrolės panelė apsaugota slaptažodžiu
- Sesija saugoma `sessionStorage` (išsivalo uždarius naršyklę)
- RLS (Row Level Security) įjungta visoms lentelėms
- Kodai yra unikalūs ir atsitiktiniai
- Slaptažodis saugomas Supabase, ne kode

## Techninės Detalės

### Kodų Generavimas
- 8 simboliai: mažosios raidės (a-z) ir skaičiai (0-9)
- Pavyzdys: `a3f7k2m9`

### Kodo Validavimas
1. Tikrinama ar kodas egzistuoja
2. Jei `unlimited = true`, kodas galioja
3. Jei ne, tikrinama `valid_from <= now <= valid_to`

### Komandos Siuntimas
Kai kodas validus ir klientas paspaudžia mygtuką "Atidaryti Vartus":
```javascript
// Sistema įrašo komandą į gate_commands lentelę
INSERT INTO gate_commands (
  command,
  status,
  device_id
) VALUES (
  'open_gate',
  'pending',
  'gate_opener_1'
);
```

**Svarbu**: Vartų kodas (`gate_codes.code`) NĖRA įrašomas į `gate_commands`. 
- `gate_codes` - prieigos kodų valdymui su datų logiką
- `gate_commands` - komandų siuntimui į įrenginius
- `gate_commands.order_code` - naudojamas SMS užsakymų sekimui kitose aplikacijose

**Pastaba**: Sistema (ne šis puslapis) turi skaityti `gate_commands` lentelę ir vykdyti komandas su `status='pending'` ir `device_id='gate_opener_1'`.

## Tobulinimų Idėjos

- [ ] Įrašyti kodų panaudojimo istoriją
- [ ] Email pranešimai apie kodo panaudojimą
- [ ] QR kodų generavimas
- [ ] Statistika (kiek kartų naudotas kodas)
- [ ] Vartų būsenos rodymas
- [ ] Push notifications per WebSocket
- [ ] Mobilios aplikacijos kūrimas

## Pagalba

Jei kyla klausimų:
1. Patikrinti Supabase konsoles errors
2. Patikrinti browser console errors (F12)
3. Patikrinti ar lentelės egzistuoja Supabase
4. Patikrinti RLS policies

## Licencija

© 2026 UAB Miltegona. Visos teisės saugomos.
