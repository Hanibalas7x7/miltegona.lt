# Cloudflare Cache Auto-Purge Setup

Šis GitHub Action automatiškai išvalo Cloudflare cache po kiekvieno push į `main` šaką, kai keičiami CSS, JS arba HTML failai.

## Setup Instrukcijos

### 1. Gauk Cloudflare Zone ID

1. Eik į [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Pasirink savo domainą `miltegona.lt`
3. Scroll žemyn dešinėje pusėje, rask **Zone ID**
4. Copy Zone ID (pvz., `abc123def456...`)

### 2. Sukurk Cloudflare API Token

1. Eik į [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Spausk **Create Token**
3. Pasirink **Custom token**
4. Duok pavadinimą: `GitHub Actions - Purge Cache`
5. Permissions:
   - **Zone** → **Cache Purge** → **Purge**
6. Zone Resources:
   - **Include** → **Specific zone** → `miltegona.lt`
7. Spausk **Continue to summary** → **Create Token**
8. **SVARBU:** Copy token dabar - daugiau jo nebepamatysi!

### 3. Pridėk Secrets į GitHub

1. Eik į GitHub repository: [miltegona.lt Settings](https://github.com/Hanibalas7x7/miltegona.lt/settings/secrets/actions)
2. Spausk **New repository secret**
3. Pridėk 2 secrets:

**Secret 1:**
- Name: `CLOUDFLARE_ZONE_ID`
- Value: `[tavo Zone ID]`

**Secret 2:**
- Name: `CLOUDFLARE_API_TOKEN`
- Value: `[tavo API Token]`

### 4. Testuok

1. Padaryk bet kokį pakeitimą CSS/JS faile
2. Push į GitHub
3. Eik į **Actions** tab GitHub
4. Turėtum matyti "Purge Cloudflare Cache" workflow running
5. Po ~10 sekundžių cache bus išvalytas automatiškai! ✅

## Kaip Veikia

- **Automatiškai:** Kai push'ini CSS, JS, arba HTML failus į `main`
- **Manually:** GitHub Actions → Purge Cloudflare Cache → Run workflow
- **Greitis:** ~5-10 sekundžių
- **Scope:** Išvalo visą cache (`purge_everything: true`)

## Troubleshooting

### Workflow neveikia?

1. Patikrink ar secrets teisingi: Settings → Secrets and variables → Actions
2. Patikrink workflow log: Actions → Purge Cloudflare Cache → Latest run
3. Patikrink API token permissions Cloudflare Dashboard

### 401 Unauthorized klaida?

- API Token neteisingas arba expired
- Sukurk naują token ir update secret

### 403 Forbidden klaida?

- Token neturi `Cache Purge` permission
- Pasitikrink token permissions Cloudflare Dashboard
