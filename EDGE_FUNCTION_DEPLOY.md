# Supabase Edge Functions Diegimas

## 1. Įdiekite Supabase CLI

```bash
# Windows (PowerShell)
winget install Supabase.CLI

# Arba naudojant npm
npm install -g supabase
```

## 2. Prisijunkite prie Supabase

```bash
supabase login
```

## 3. Susiekite su projektu

```bash
cd c:\Users\Miltegona\miltegona.lt
supabase link --project-ref vzjnywppcnhgxdjvvgvn
```

## 4. Įkelkite Edge Functions

```bash
# Vartų atidarymo funkcija
supabase functions deploy validate-and-open

# Slaptažodžio validavimo funkcija
supabase functions deploy validate-password
```

## 5. Nustatykite Environment Variables

Supabase Dashboard → Settings → Edge Functions:

- `SUPABASE_URL`: https://vzjnywppcnhgxdjvvgvn.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: (iš Supabase Dashboard → Settings → API → service_role key)

## 6. Testuokite funkciją

```bash
curl -X POST https://vzjnywppcnhgxdjvvgvn.supabase.co/functions/v1/validate-and-open \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"code": "test1234"}'
```

## Funkcijų Veikimas

### 1. validate-and-open (Vartų atidarymas)

**Rate Limiting**: 60 užklausų per valandą vienam IP adresui

**Proceso Eiga**:
1. Patikrina IP rate limit (60/valandą)
2. Validuoja kodą `gate_codes` lentelėje
3. Tikrina ar kodas galioja pagal datą
4. Jei galioja - įrašo komandą į `gate_commands`
5. Grąžina rezultatą

**Atsakymai**:
- `200 OK`: Vartai atidaromi
- `400 Bad Request`: Kodas nenurodytas
- `404 Not Found`: Kodas nerastas
- `403 Forbidden`: Kodas nebegalioja
- `429 Too Many Requests`: Viršytas limitas
- `500 Internal Server Error`: Serverio klaida

### 2. validate-password (Slaptažodžio tikrinimas)

**Rate Limiting**: 60 užklausų per valandą vienam IP adresui

**Proceso Eiga**:
1. Patikrina IP rate limit (60/valandą)
2. Tikrina slaptažodį `control_password` lentelėje
3. Jei teisingas - generuoja session token
4. Grąžina rezultatą

**Atsakymai**:
- `200 OK`: Slaptažodis teisingas, grąžinamas session token
- `400 Bad Request`: Slaptažodis nenurodytas
- `401 Unauthorized`: Neteisingas slaptažodis
- `429 Too Many Requests`: Viršytas limitas (apsaugo nuo brute force)
- `500 Internal Server Error`: Serverio klaida
