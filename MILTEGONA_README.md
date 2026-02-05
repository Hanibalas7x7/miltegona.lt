# Miltegona.lt - Company Website

## Projekto Struktūra

### Svetainės Dalys

1. **Pagrindinė svetainė** (`/`)
   - Company website su miltelinio dažymo paslaugomis
   - Galerija, kainų skaičiuoklė, kontaktai
   - SEO optimizuota (Schema.org, Open Graph)
   - GitHub Pages hosting

2. **Vartų Kontrolės Sistema** (`/kontrole/`, `/atidaryti/`)
   - Admin panelė kodo generavimui
   - Viešas puslapis vartų atidarymui
   - Supabase Edge Functions backend
   - Rate limiting (60 requests/hour)
   - [Dokumentacija: GATE_CONTROL_README.md](GATE_CONTROL_README.md)

3. **Darbuotojų Portalas** (`/darbuotojai/`) 🆕
   - Prisijungimas su email/slaptažodžiu
   - Mėnesio darbo valandų suvestinės
   - Mėnesio atlyginimų peržiūra
   - Integracija su tabelis duomenų baze
   - [Dokumentacija: DARBUOTOJAI_README.md](DARBUOTOJAI_README.md)

## Technologijos

### Frontend
- HTML5, CSS3, JavaScript (vanilla)
- Responsive dizainas
- Google Fonts (Roboto)
- No frameworks policy (lengvumas, greitis)

### Backend
- Supabase (PostgreSQL + Edge Functions)
- Deno runtime Edge Functions
- Row Level Security (RLS)
- Rate limiting implementacija

### Deployment
- GitHub Pages hosting
- Supabase Dashboard (Edge Functions)
- Custom domain (miltegona.lt)

## Įdiegimas

### 1. Clone Repository
```bash
git clone https://github.com/Hanibalas7x7/miltegona.lt.git
cd miltegona.lt
```

### 2. Supabase Setup

#### Sukurti Supabase projektą
1. Eiti į https://app.supabase.com
2. Create new project
3. Copy Project URL ir Service Role Key

#### Įvykdyti database schema
```sql
-- supabase-schema.sql
-- Gate control tables: control_password, gate_codes, gate_commands
```

### 3. Edge Functions Deployment

See [GATE_CONTROL_README.md](GATE_CONTROL_README.md) ir [DARBUOTOJAI_README.md](DARBUOTOJAI_README.md)

### 4. GitHub Pages Setup
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

Settings → Pages → Source: main branch

### 5. Custom Domain (optional)
- Settings → Pages → Custom domain
- Add DNS records (CNAME)

## Projekto Failai

### Pagrindiniai failai
- `index.html` - Pagrindinis puslapis
- `kontrole/index.html` - Vartų kontrolės admin panelė
- `atidaryti/index.html` - Viešas vartų atidarymo puslapis
- `darbuotojai/index.html` - Darbuotojų portalas
- `supabase-schema.sql` - Vartų kontrolės duomenų bazės schema
- `supabase/functions/` - Edge Functions kodas

### Konfigūracijos
- `js/kontrole.js` - Vartų kontrolės logika (EDGE_FUNCTIONS_URL)
- `js/darbuotojai.js` - Darbuotojų portalo logika (EDGE_FUNCTIONS_URL)

### Dokumentacija
- `GATE_CONTROL_README.md` - Vartų kontrolės sistema
- `DARBUOTOJAI_README.md` - Darbuotojų portalo instrukcijos
- `DEPLOY_MANUAL.md` - Deployment instrukcijos
- `GALLERY_README.md` - Galerijos valdymas

## Saugumas

### ✅ Implemented
- RLS DENY ALL policies (vartų kontrolė)
- Edge Functions su SERVICE_ROLE_KEY
- Rate limiting (60 req/hour per IP)
- HTTPS only
- No API keys kliento kode
- Session tokens localStorage

### ⚠️ Recommendations
- Two-factor authentication
- Password reset flow
- Session expiration UI
- Audit logging
- IP whitelist admin panel

## Maintenance

### Galerijos Atnaujinimas
```bash
python generate_gallery.py
```

### Edge Functions Update
1. Edit code in `supabase/functions/`
2. Deploy via Supabase Dashboard
3. Test funkcionalumą

### Database Backup
Supabase Dashboard → Database → Backups

## Versijos

### v3.0.0 (2026-02-03)
- ✨ Pridėtas darbuotojų portalas
- 🔐 Integracija su tabelis authentication
- 📊 Mėnesio suvestinių ir atlyginimų peržiūra
- 🔒 4 nauji Edge Functions

### v2.0.0
- ✨ Vartų kontrolės sistema
- 🔐 RLS DENY ALL security model
- ⚡ Rate limiting

### v1.0.0
- 🎉 Pradinė svetainė
- 🖼️ Galerija
- 💰 Kainų skaičiuoklė
- 📧 Kontaktų forma

## Projekto Nuorodos

- **Live Website**: https://miltegona.lt
- **Darbuotojų Portalas**: https://miltegona.lt/darbuotojai/
- **GitHub**: https://github.com/Hanibalas7x7/miltegona.lt
- **Tabelis App**: https://github.com/Hanibalas7x7/tabelis
- **Supabase**: https://app.supabase.com

## Contact

UAB Miltegona
- Email: info@miltegona.lt
- Tel: +370 XXX XXXXX

---

Made with ❤️ by Hanibalas7x7
