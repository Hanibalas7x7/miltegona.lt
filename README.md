# miltegona.lt

Oficialios **UAB „Miltegona“** svetainės ir vidinių įrankių kodas.

- Svetainė: https://miltegona.lt/
- Repozitorija: https://github.com/Hanibalas7x7/miltegona.lt

## Kas yra šiame repozitorijoje

- **Vieša svetainė** (statiniai puslapiai): `/` ir katalogai kaip `/galerija/`, `/kaina/`, `/kontaktai/` ir pan.
- **Administravimo panelė**: `/kontrole/` (vartų kodų valdymas + galerijos nuotraukų įkėlimas)
- **Supabase Edge Functions**: `supabase/functions/*` (API logika, galerijos valdymas ir kt.)

## Struktūra (trumpai)

- `index.html` – pagrindinis puslapis
- `css/` – bendri ir puslapių stiliai
- `js/` – front-end logika
- `kontrole/` – kontrolės panelės UI
- `supabase/functions/` – Supabase Edge Functions (Deno)
- `assets/` – paveikslėliai ir kiti statiniai resursai

## Paleidimas lokaliai

Projektas yra statinis, todėl pakanka bet kokio „static server“.

### Variantai

**1) VS Code Live Server**
- Įdiekite „Live Server“ extension
- Atidarykite `index.html` → *Open with Live Server*

**2) Python (tik serveriui, be jokių projekto skriptų)**

```bash
python -m http.server 8000
```

Tada atidarykite:
- http://localhost:8000/

## Supabase / Edge Functions

Edge Functions yra kataloge `supabase/functions/`.

### Diegimas (bendras principas)

```bash
supabase functions deploy <funkcijos-pavadinimas>
```

Kai kurioms funkcijoms gali reikėti `--no-verify-jwt` (priklauso nuo to, ar funkcija vieša, ar reikalauja autentifikacijos).

## Kontrolės panelė (`/kontrole/`)

Skirta vidiniam naudojimui. Leidžia:
- generuoti ir valdyti vartų kodus
- įkelti / trinti galerijos nuotraukas (su validacija)

## Galerija

Galerijos įkėlimas/valdymas remiasi:
- front-end logika `js/kontrole.js`
- Edge Function `supabase/functions/manage-gallery`

Papildoma dokumentacija: `GALLERY_README.md`.

## Naudingi dokumentai

- `GALLERY_README.md` – galerijos taisyklės ir atnaujinimas
- `EDGE_FUNCTION_DEPLOY.md` – Edge Functions diegimo užrašai
- `GATE_CONTROL_README.md` – vartų kontrolės aprašymas
- `SEO_DEPLOYMENT_GUIDE.md` – SEO pakeitimai (galerija/sitemap)

## Saugumas

Šiame repozitorijoje neturėtų būti:
- Supabase service role raktų
- slaptažodžių
- privačių API raktų

Raktai ir konfigūracija turi būti laikomi Supabase „Secrets“ ir (arba) diegimo aplinkoje.

## Licencija

Žr. failą [`LICENSE`](./LICENSE) (privatus projektas, *All rights reserved*).