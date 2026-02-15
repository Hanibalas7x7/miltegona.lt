# 🖼️ Galerijos Sistema - Deployment Guide

## Sistema: Automatinis Upload → WebP Konversija → Supabase Storage

### Architektūra
- **Backend**: Supabase Edge Function `manage-gallery`
- **Storage**: Supabase Storage bucket `gallery-images`
- **Database**: PostgreSQL table `gallery_images`
- **Frontend**: Kontrolės panelė `/kontrole` su Galerija tab
- **Kompresija**: Resize (max 1920px) + WebP encoding (quality 75)
- **Thumbnails**: 400px (desktop) + 200px (mobile) - responsive srcset

---

## 📋 Deployment Steps

### 1. Sukurti SQL Schema

#### Supabase Dashboard → SQL Editor:

```sql
-- Run this SQL in Supabase SQL Editor
-- File: supabase/migrations/gallery_schema.sql

CREATE TABLE IF NOT EXISTS gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  thumbnail_path TEXT,
  category TEXT NOT NULL CHECK (category IN ('metalwork', 'furniture', 'automotive', 'industrial')),
  title TEXT,
  description TEXT,
  file_size INTEGER,
  original_size INTEGER,
  width INTEGER,
  height INTEGER,
  thumbnail_width INTEGER DEFAULT 400,
  thumbnail_height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery_images(category);
CREATE INDEX IF NOT EXISTS idx_gallery_created ON gallery_images(created_at DESC);

ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gallery images are publicly readable"
  ON gallery_images FOR SELECT
  USING (true);

CREATE POLICY "Gallery images management through service role"
  ON gallery_images FOR ALL
  USING (true);
```

### 2. Sukurti Storage Bucket

#### Supabase Dashboard → Storage → Create Bucket:

- **Bucket name**: `gallery-images`
- **Public**: ✅ Yes (for direct image access)
- **File size limit**: 100 MB
- **Allowed MIME types**: `image/jpeg, image/jpg, image/png, image/webp`

#### Bucket folder structure (will be created automatically):
```
gallery-images/
  ├── metalines/     (metalwork)
  ├── baldai/        (furniture)
  ├── automobiliai/  (automotive)
  └── pramone/       (industrial)
```

### 3. Deploy Edge Function

#### PowerShell:
```powershell
cd "E:\Users\Bart\Documents\FlutterProjects\miltegona.lt"
supabase functions deploy manage-gallery
```

#### Verify deployment:
```
✅ Function URL: https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/manage-gallery
```

### 4. Test Upload

1. Atidaryti `/kontrole` puslapį
2. Prisijungti su slaptažodžiu
3. Pereiti į **Galerija** tab
4. Įkelti testinę nuotrauką (pvz., 10MB JPG)
5. Patikrinti:
   - ✅ Upload turi veikti
   - ✅ Kompresijos ratio turi rodyti ~95%+
   - ✅ Nuotrauka turi atsirasti sąraše
   - ✅ Thumbnail turi krautis iškart

---

## 🎯 Funkcionalumas

### Upload Procesas:
1. **User uploads** JPG/PNG (net 50MB)
2. **Edge Function**:
   - Decode image
   - Resize to max 1920px width
   - Encode to WebP (75% quality)
   - Generate 400px thumbnail (desktop)
   - Generate 200px thumbnail (mobile)
   - Upload all 3 files to Supabase Storage
3. **Result**: Main ~300KB-1MB, Thumb 400px ~50KB, Thumb 200px ~15KB
4. **Frontend**: Responsive srcset automatically loads optimal size

### API Endpoints:

#### GET - List images
```bash
GET /manage-gallery
GET /manage-gallery?category=metalwork
Headers: x-password: <password>
```

#### POST - Upload image
```bash
POST /manage-gallery
Headers: x-password: <password>
Content-Type: multipart/form-data

FormData:
  - image: File
  - category: metalwork|furniture|automotive|industrial
  - title: string (optional)
  - description: string (optional)
```

#### POST - Delete image
```bash
POST /manage-gallery
Headers: 
  x-password: <password>
  Content-Type: application/json

Body:
{
  "action": "delete",
  "id": "uuid"
}
```

---

## 📊 Kategorijos

| ID | Pavadinimas | Folder |
|----|-------------|--------|
| `metalwork` | Metalinės konstrukcijos | metalines |
| `furniture` | Baldai | baldai |
| `automotive` | Automobilių dalys | automobiliai |
| `industrial` | Pramoninė įranga | pramone |

---

## 🔧 Konfigūracija

### Edge Function Settings:
```typescript
MAX_WIDTH = 1920              // Main image max width
THUMBNAIL_WIDTH = 400         // Desktop thumbnail
THUMBNAIL_SMALL_WIDTH = 200   // Mobile thumbnail
WEBP_QUALITY = 75             // WebP compression quality
```

### Responsive Loading:
```html
<img src="thumb_400.webp" 
     srcset="thumb_200.webp 200w, thumb_400.webp 400w"
     sizes="(max-width: 768px) 150px, 250px">
```
Browser automatically chooses optimal thumbnail based on screen size.

### Storage URL Pattern:
```
https://xyzttzqvbescdpihvyfu.supabase.co/storage/v1/object/public/gallery-images/{path}
```

---

## 🚀 Future Upgrades

### AVIF Support (kada Deno edge functions palaikys):
- Replace WebP with AVIF encoding
- Expected compression: +20-30% better than WebP
- Library: `@jsquash/avif` or similar

### Progressive Image Loading:
- Generate BlurHash for ultra-fast placeholder
- Lazy loading with Intersection Observer

### Batch Upload:
- Multiple images at once
- Progress bar for each

---

## 🐛 Troubleshooting

### Error: "Bucket 'gallery-images' not found"
→ Sukurti bucket per Supabase Dashboard → Storage

### Error: "Row level security policy violation"
→ Paleisti RLS policies SQL (žr. step 1)

### Error: "Image decode failed"
→ Patikrinti ar failas yra valid image format

### Upload per lėtas
→ Patikrinti originalaus failo dydį (max 100MB)

### Nuotraukos nerodoma
→ Patikrinti ar bucket Public setting = Yes

---

## 📁 File Structure

```
supabase/
  functions/
    manage-gallery/
      index.ts                 # Edge Function
  migrations/
    gallery_schema.sql         # Database schema

kontrole/
  index.html                   # Updated with Gallery tab

css/
  kontrole.css                 # Gallery UI styles

js/
  kontrole.js                  # Gallery upload/display logic
```

---

## ✅ Completion Checklist

- [x] SQL schema sukurta
- [x] Storage bucket sukurtas
- [x] Edge Function deployed
- [ ] Testavimas su realia nuotrauka
- [ ] Patikrinti kompresijos koeficientą
- [ ] Veikia thumbnail generavimas
- [ ] Gallery grid rodo nuotraukas
- [ ] Delete funkcija veikia
