# SEO Improvements Deployment Guide

## Overview
Added two SEO improvements for the gallery:
1. **Structured Data (Schema.org)** - Automatically added to page when gallery loads
2. **Dynamic Sitemap** - Includes all gallery images for Google Image Search

## 1. Structured Data ✅ AUTOMATIC
Already working! The `gallery.js` file now automatically adds Schema.org ImageGallery markup when images load.

**What it does:**
- Tells Google each image's URL, title, description, dimensions
- Improves Google Image Search indexing
- No deployment needed - works immediately

## 2. Dynamic Sitemap - REQUIRES DEPLOYMENT

### Deploy Sitemap Edge Function

```bash
cd "e:\Users\Bart\Documents\FlutterProjects\miltegona.lt"

# Deploy sitemap function (no JWT verification needed - public access)
supabase functions deploy sitemap --no-verify-jwt
```

### Test Sitemap

```bash
# Test locally
curl https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/sitemap

# Should return XML with:
# - All website pages
# - All gallery images with <image:image> tags
```

### robots.txt Update ✅ DONE
Already updated to point to: `https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/sitemap`

## Benefits

### Structured Data:
- ✅ Google sees images immediately (even with JavaScript)
- ✅ Better Google Image Search ranking
- ✅ Rich snippets in search results
- ✅ Shows image count, titles, descriptions

### Dynamic Sitemap:
- ✅ Automatic updates when you add/delete gallery images
- ✅ Google Image Search crawler finds all images
- ✅ Proper XML format with image:image tags
- ✅ Cached for 1 hour (reduces Supabase function calls)

## Verification

After deployment:

1. **Google Search Console:**
   - Submit new sitemap: `https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/sitemap`
   - Check "Coverage" - should show gallery page indexed
   - Check "Enhancements" > "Image Search" - should show gallery images

2. **Test Structured Data:**
   - Go to: https://search.google.com/test/rich-results
   - Enter: `https://miltegona.lt/galerija/`
   - Should detect "ImageGallery" with all images

3. **Manual Check:**
   - Open `https://miltegona.lt/galerija/` in Chrome
   - Open DevTools > Application > IndexedDB
   - Look for Schema.org script in `<head>`

## Maintenance

- **Structured Data**: Auto-updates on every page load ✅
- **Sitemap**: Auto-updates when Edge Function is called (Google crawls ~daily) ✅
- No manual maintenance needed! 🎉

## Notes

- Sitemap caches for 1 hour to reduce function calls
- Google typically re-crawls sitemap every 1-7 days
- Gallery images show up in Google Image Search within 1-2 weeks
- Total additional Supabase usage: ~1 sitemap request per day from Google (negligible)
