# Kaip Įdiegti Edge Functions Per Supabase Dashboard

Kadangi CLI reikalauja papildomų leidimų, galite įdiegti funkcijas tiesiogiai per Supabase Dashboard:

## 1. Validate-And-Open (Vartų atidarymas)

### Žingsniai:
1. Eikite į: https://supabase.com/dashboard/project/vzjnywppcnhgxdjvvgvn/functions
2. Spauskite "Create a new function"
3. Function name: `validate-and-open`
4. Įklijuokite kodą iš `supabase/functions/validate-and-open/index.ts`
5. Spauskite "Deploy function"

## 2. Validate-Password (Slaptažodžio tikrinimas)

### Žingsniai:
1. Tame pačiame puslapyje spauskite "Create a new function"
2. Function name: `validate-password`
3. Įklijuokite kodą iš `supabase/functions/validate-password/index.ts`
4. Spauskite "Deploy function"

## 3. Nustatyti Environment Variables

Settings → Edge Functions → Environment Variables:

```
SUPABASE_URL=https://vzjnywppcnhgxdjvvgvn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<jūsų service_role key>
```

**Service Role Key** gauti:
- Settings → API → Project API keys → service_role (secret)

## 4. Testuoti funkcijas

### Validate-and-open:
```bash
curl -X POST https://vzjnywppcnhgxdjvvgvn.supabase.co/functions/v1/validate-and-open \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"code": "test1234"}'
```

### Validate-password:
```bash
curl -X POST https://vzjnywppcnhgxdjvvgvn.supabase.co/functions/v1/validate-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"password": "admin123"}'
```

## Arba per CLI su tinkamais leidimais:

```powershell
# Jei turite owner/admin prieigą prie projekto:
.\supabase.exe link --project-ref vzjnywppcnhgxdjvvgvn
.\supabase.exe functions deploy validate-and-open
.\supabase.exe functions deploy validate-password
```

## Patikrinti ar funkcijos veikia:

Supabase Dashboard → Edge Functions → Logs

Turėtumėte matyti:
- ✅ `validate-and-open` - deployed
- ✅ `validate-password` - deployed
