# Manual Edge Function Deployment

## Supabase Dashboard Method

1. Go to: https://supabase.com/dashboard/project/hnfldvugfghkyftapkgm/functions

2. Click **"Create a new function"**

3. Function details:
   - Name: `manage-gallery`
   - **Verify JWT: UNCHECK (OFF)** ✓ CRITICAL
   - Import limit: 100 MB
   - Request timeout: 300 seconds

4. Copy full code from `supabase/functions/manage-gallery/index.ts`

5. Paste ENTIRE file content into editor

6. Click **Deploy**

7. Wait ~30 seconds for deployment to complete

8. Verify function appears in list with green status indicator

## Test Deployment

Open browser console and run:
```javascript
fetch('https://hnfldvugfghkyftapkgm.supabase.co/functions/v1/manage-gallery')
  .then(r => r.json())
  .then(d => console.log(d));
```

Should return: `{success: true, data: [...]}`

## Environment Variables

After deploying function, set secrets:

1. Go to Function Settings → Environment Variables

2. Add:
   - Name: `TINIFY_API_KEY`
   - Value: `BlwKJS2XVnLD9Mghvf2hQBHYJgQP6630`
   - Click Save

3. Redeploy function after adding secrets

## Troubleshooting

- If CORS error persists: Check "Verify JWT" is OFF
- If function doesn't appear: Clear browser cache
- If 404 error: Function not deployed, repeat steps above
