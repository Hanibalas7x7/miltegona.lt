# Paint Label Scanner - Edge Function

Centralized OCR service using Google Cloud Vision API for scanning paint labels.

## Features

- ✅ Google Cloud Vision OCR (95-99% accuracy)
- ✅ Extracts: manufacturer, product code, RAL code, weight, surface, gloss, paint type
- ✅ Used by both Flutter app and web page
- ✅ First 1000 scans/month FREE

## Setup

### 1. Enable Google Cloud Vision API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Cloud Vision API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Cloud Vision API"
   - Click "Enable"

### 2. Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service account"
3. Set name: `miltegona-paint-scanner`
4. Grant role: **"Viewer"** (from Basic category)
5. Create and download JSON key file

### 3. Set Supabase Secret

```bash
# Set entire JSON file as secret
supabase secrets set GOOGLE_CLOUD_CREDENTIALS="$(cat your-service-account.json)"
```

Or via Supabase Dashboard:
1. Go to Project Settings → Edge Functions
2. Add secret: `GOOGLE_CLOUD_CREDENTIALS`
3. Paste entire JSON file content as value

### 4. Deploy Edge Function

```bash
cd supabase/functions
supabase functions deploy scan-paint-label
```

## Usage

### Request

```typescript
POST https://your-project.supabase.co/functions/v1/scan-paint-label

{
  "image_base64": "base64_encoded_image_string"
}
```

### Response

```typescript
{
  "success": true,
  "manufacturer": "EuroPolveri",
  "product_code": "52LN1901120",
  "ral_code": "RAL7016",
  "weight_kg": 25.0,
  "surface": "Smooth",
  "gloss": "Matt",
  "paint_type": "Polyester",
  "full_text": "..." // Full OCR text for debugging
}
```

### Error Response

```typescript
{
  "success": false,
  "error": "Error message"
}
```

## Integration Examples

### Flutter App

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<Map<String, dynamic>> scanPaintLabel(String imagePath) async {
  // Read image file and convert to base64
  final bytes = await File(imagePath).readAsBytes();
  final base64Image = base64Encode(bytes);
  
  // Call Edge Function
  final response = await http.post(
    Uri.parse('${supabaseUrl}/functions/v1/scan-paint-label'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $anonKey',
    },
    body: jsonEncode({'image_base64': base64Image}),
  );
  
  return jsonDecode(response.body);
}
```

### Web JavaScript

```javascript
async function scanPaintLabel(imageFile) {
  // Convert image to base64
  const base64 = await fileToBase64(imageFile);
  
  // Call Edge Function
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/scan-paint-label`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ image_base64: base64 }),
    }
  );
  
  return await response.json();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

## Testing

Test with curl:

```bash
# Convert image to base64
BASE64_IMAGE=$(base64 -w 0 test_label.jpg)

# Call function
curl -X POST \
  https://your-project.supabase.co/functions/v1/scan-paint-label \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d "{\"image_base64\": \"$BASE64_IMAGE\"}"
```

## Cost

**Google Cloud Vision Pricing:**
- First 1,000 requests/month: **FREE**
- Next 4,999,000 requests: **$1.50 per 1,000**
- Over 5,000,000: **$0.60 per 1,000**

**Example costs:**
- 500 scans/month: **$0**
- 2,000 scans/month: **$1.50**
- 10,000 scans/month: **$13.50**

## Supported Manufacturers

- EuroPolveri
- Ripol
- Tiger
- EkoColor
- NEOKEM
- Axalta
- Jotun
- PPG
- Sherwin-Williams
- Interpon
- BULLCREM
- And more...

## Maintenance

To update extraction logic:
1. Edit `index.ts`
2. Redeploy: `supabase functions deploy scan-paint-label`
3. Changes apply to both Flutter app and web instantly!
