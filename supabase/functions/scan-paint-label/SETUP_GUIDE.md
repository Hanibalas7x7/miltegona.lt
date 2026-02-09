# Setup Guide: Paint Label Scanner Edge Function

Complete step-by-step setup for centralized OCR service.

## Prerequisites

- Google Cloud account
- Supabase project
- Supabase CLI installed (`npm install -g supabase`)

## Step 1: Google Cloud Setup (5 minutes)

### 1.1 Create/Select Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click project dropdown (top left)
3. Click "New Project" or select existing
4. Enter project name: `miltegona-ocr` (or any name)
5. Click "Create"

### 1.2 Enable Cloud Vision API

1. In Google Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Search for **"Cloud Vision API"**
3. Click on it
4. Click **"Enable"** button
5. Wait ~1 minute for activation

### 1.3 Create Service Account

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** → **"Service account"**
3. Fill in details:
   - **Service account name**: `miltegona-paint-scanner`
   - **Service account ID**: (auto-filled, leave as is)
   - **Description**: `OCR service for paint labels`
4. Click **"CREATE AND CONTINUE"**
5. **Grant this service account access to project**:
   - Click **"Select a role"** dropdown
   - Go to **"Basic"** category
   - Select **"Viewer"**
   - Click **"CONTINUE"**
6. Skip "Grant users access" (click **"DONE"**)

### 1.4 Create JSON Key

1. In the **Credentials** page, find your service account in the list
2. Click on the service account name (e.g., `miltegona-paint-scanner@...`)
3. Go to **"KEYS"** tab
4. Click **"ADD KEY"** → **"Create new key"**
5. Choose **"JSON"** format
6. Click **"CREATE"**
7. JSON file will be downloaded automatically - **SAVE IT SECURELY!**

Example file name: `miltegona-ocr-abc123def456.json`

### 1.5 Extract Credentials from JSON

Open the downloaded JSON file. You'll need the entire file content for the next step.

The file looks like this:
```json
{
  "type": "service_account",
  "project_id": "miltegona-ocr",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "miltegona-paint-scanner@miltegona-ocr.iam.gserviceaccount.com",
  ...
}
```

**Keep this file safe!** Anyone with this file can use your Google Cloud account.

### 1.6 Verify Role (Optional but Recommended)

If you're not sure the role was assigned correctly:

1. Go to **"IAM & Admin"** → **"IAM"**
2. Find your service account in the list (e.g., `miltegona-paint-scanner@...`)
3. Click the **pencil icon** (edit)
4. Verify it has **"Viewer"** role (roles/viewer)
5. If missing, click **"ADD ANOTHER ROLE"** and add it

---

## Step 2: Supabase Configuration (2 minutes)

### 2.1 Set Secret via Supabase CLI

You need to set the **entire JSON file content** as a secret.

```bash
# Navigate to your project
cd e:\Users\Bart\Documents\FlutterProjects\miltegona.lt

# OPTION A: Set from file (recommended)
supabase secrets set GOOGLE_CLOUD_CREDENTIALS="$(cat path/to/your-service-account.json)"

# OPTION B: Manual (if above doesn't work on Windows)
# Copy the entire content of your JSON file, then:
supabase secrets set GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account","project_id":"...entire json here..."}'
```

**Windows PowerShell:**
```powershell
# Read JSON file and set as secret
$json = Get-Content "path\to\your-service-account.json" -Raw
supabase secrets set GOOGLE_CLOUD_CREDENTIALS="$json"
```

### 2.2 Alternative: Set via Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **"Project Settings"** → **"Edge Functions"**
4. Under **"Secrets"**, click **"Add new secret"**
5. Name: `GOOGLE_CLOUD_CREDENTIALS`
6. Value: **Paste the entire JSON file content** (all lines, including braces)
7. Click **"Create secret"**

---

## Step 3: Deploy Edge Function (1 minute)

```bash
# Make sure you're in the project root
cd e:\Users\Bart\Documents\FlutterProjects\miltegona.lt

# Login to Supabase (if not already)
supabase login

# Link to your project (if not already)
supabase link --project-ref your-project-id

# Deploy the function
supabase functions deploy scan-paint-label
```

You should see:
```
✓ Deployed Function scan-paint-label on project your-project-id
  https://your-project-id.supabase.co/functions/v1/scan-paint-label
```

---

## Step 4: Test the Function (2 minutes)

### 4.1 Get Your Supabase Credentials

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Copy:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: `eyJhbGc...your_anon_key...`

### 4.2 Test with Test Script

```bash
# Set environment variables
export SUPABASE_URL="https://your-project-id.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGc...your_anon_key..."

# Run test (use any paint label image)
cd supabase/functions/scan-paint-label
deno run --allow-all test_scanner.ts path/to/test_image.jpg
```

You should see output like:
```
✅ SUCCESS!

📋 Extracted Data:
   Manufacturer: EuroPolveri
   Product Code: 52LN1901120
   RAL Code: RAL7016
   Weight: 25.0 kg
   Surface: Smooth
   Gloss: Matt
   Paint Type: Polyester
```

### 4.3 Troubleshooting Test

**Error: "GOOGLE_CLOUD_CREDENTIALS not configured"**
- Secret not set correctly in Supabase
- Make sure you pasted the **entire JSON file content**
- Redeploy function after setting secret

**Error: "Vision API error: 403"**
- Service account doesn't have correct permissions
- Go to Google Cloud Console → IAM & Admin → IAM
- Find your service account, make sure it has "Viewer" role
- If missing, add it and redeploy function

**Error: "Vision API error: 400"**
- Invalid image format
- Try with different image (JPEG/PNG)

---

## Step 5: Verify Billing (1 minute)

Google Cloud Vision needs billing enabled (but first 1000/month are FREE).

1. Go to **Google Cloud Console** → **Billing**
2. Click **"Link a billing account"** if not set up
3. Add payment method (won't be charged for first 1000)
4. Confirm billing is active

**Don't worry:** You have **1000 FREE scans every month** (resets monthly).

---

## Summary

✅ **Total setup time:** ~10 minutes  
✅ **Monthly cost:** $0 (if <1000 scans) or ~$1.50 per additional 1000  
✅ **Accuracy:** 95-99% (Google Cloud Vision)  
✅ **Maintenance:** Zero - one codebase for all platforms  

## Next Steps

1. **Flutter App Integration**: See `FLUTTER_INTEGRATION.md`
2. **Web Page Integration**: See `WEB_INTEGRATION.md`
3. **Monitor Usage**: Google Cloud Console → APIs & Services → Dashboard

## Support

Issues? Check:
- Edge Function logs: Supabase Dashboard → Edge Functions → Logs
- Google Cloud Vision logs: Google Cloud Console → Logging
- Test locally: `supabase functions serve scan-paint-label`
