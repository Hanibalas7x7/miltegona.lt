import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all gallery images
    const { data: images, error } = await supabase
      .from("gallery_images")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const storageUrl = `${supabaseUrl}/storage/v1/object/public/gallery-images`;
    
    // Build sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://miltegona.lt/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://miltegona.lt/apie-mus/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://miltegona.lt/miltelinis-dazymas/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://miltegona.lt/dazai/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://miltegona.lt/galerija/</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>`;

    // Add gallery images to sitemap
    if (images && images.length > 0) {
      for (const img of images) {
        const imageUrl = `${storageUrl}/${img.storage_path}`;
        const title = img.title || `Miltelinio dažymo darbas`;
        const description = img.description || `Miltelinio dažymo paslaugos - UAB Miltegona`;
        
        sitemap += `
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${escapeXml(title)}</image:title>
      <image:caption>${escapeXml(description)}</image:caption>
    </image:image>`;
      }
    }

    sitemap += `
  </url>
  <url>
    <loc>https://miltegona.lt/kontaktai/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response("Error generating sitemap", { status: 500 });
  }
});

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
