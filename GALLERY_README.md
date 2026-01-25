# 🖼️ Galerijos Sistema

## Automatinė darbų galerija su Python generatoriumi

### 📁 Folderių struktūra:

```
assets/
  gallery/
    metalines/       → Metalinės konstrukcijos
    baldai/          → Baldai
    automobiliai/    → Automobilių dalys
    pramone/         → Pramoninė įranga
```

---

## 🚀 Kaip pridėti naujas nuotraukas

### 1. Įkelkite nuotraukas į atitinkamus folderius

**Pavyzdys:**
- Dažytų tvoros paveiksliukas → `/assets/gallery/metalines/tvora-ral-7016.jpg`
- Baldų nuotrauka → `/assets/gallery/baldai/biuro-stalas.jpg`
- Auto dalys → `/assets/gallery/automobiliai/skardiniai-raudoni.png`

**Palaikomos plėtinės:** `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`

---

### 2. Paleiskite Python scriptą

```bash
python generate_gallery.py
```

**Išvestis:**
```
🖼️  Gallery Generator - Nuskaitydamas nuotraukas...

✅ Metalinės konstrukcijos: 5 nuotraukų
✅ Baldai: 3 nuotraukų
✅ Automobilių dalys: 7 nuotraukų
✅ Pramoninė įranga: 2 nuotraukų

📊 Iš viso rasta: 17 nuotraukų

✅ Sėkmingai sugeneruotas: gallery-config.json
```

---

### 3. Įkelkite į GitHub

```bash
git add assets/gallery/ gallery-config.json
git commit -m "Gallery: Add new images"
git push origin main
```

---

## ⚙️ Kaip veikia sistema

1. **Python scriptas** (`generate_gallery.py`) nuskaito visus folderius
2. Sukuria **`gallery-config.json`** failą su nuotraukų sąrašu
3. **JavaScript** (`gallery.js`) skaito JSON ir generuoja galeriją dinamiškai
4. **Filtrai** veikia automatiškai pagal kategorijas

---

## 💡 Pavyzdys - gallery-config.json

```json
{
  "generated_at": "2026-01-26T12:00:00",
  "categories": [...],
  "images": [
    {
      "filename": "tvora-ral-7016.jpg",
      "path": "/assets/gallery/metalines/tvora-ral-7016.jpg",
      "category": "metalwork",
      "category_name": "Metalinės konstrukcijos",
      "title": "Tvora Ral 7016",
      "size": 458392,
      "added": "2026-01-26T11:45:32"
    }
  ]
}
```

---

## 🎨 Nuotraukų optimizacija (rekomenduojama)

**Prieš įkeliant nuotraukas:**

1. **Sumažinkite failų dydį**: 
   - Maksimalus plotis: 1920px
   - Kokybė: 80-85%
   - Rekomenduojama: https://tinypng.com/

2. **Vardų konvencija**:
   - Naudokite kebab-case: `metalo-konstrukcija-juoda.jpg`
   - Nenaudokite lietuviškų raidžių failo pavadinime

3. **Aprašymai**:
   - Failo vardas virsta title: `metalo-konstrukcija-juoda` → "Metalo Konstrukcija Juoda"

---

## 🔧 Troubleshooting

### Python scriptas neranda folderių
```bash
# Patikrinkite ar esate projekte root directory
cd e:\Users\Bart\Documents\Miltegona_page
python generate_gallery.py
```

### Nuotrauka neatsiranda galerijoje
1. Patikrinkite failo plėtinį (turi būti `.jpg`, `.png`, etc.)
2. Paleiskite scriptą iš naujo
3. Clear browser cache (Ctrl+Shift+R)

### JSON failas sugadintas
- Paleiskite `python generate_gallery.py` - automatiškai perdarys

---

## 📝 Quick Reference

| Veiksmas | Komanda |
|----------|---------|
| Generate galerija | `python generate_gallery.py` |
| Peržiūrėti lokaliai | Open `gallery.html` su Live Server |
| Upload į GitHub | `git add . && git commit -m "Update gallery" && git push` |

---

**Sukurta:** 2026-01-26  
**Autorius:** GitHub Copilot
