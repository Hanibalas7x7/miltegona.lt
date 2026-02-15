import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Configuration
const ALLOWED_CATEGORIES = ['metalwork', 'furniture', 'automotive', 'industrial'];
const MAX_WIDTH = 1920;
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_SMALL_WIDTH = 200;

// Category mapping
const CATEGORY_FOLDERS = {
  'metalwork': 'metalines',
  'furniture': 'baldai',
  'automotive': 'automobiliai',
  'industrial': 'pramone'
};

// TinyPNG API - Resize and convert from compressed URL
async function resizeAndConvertToAVIF(outputUrl: string, auth: string, maxWidth: number): Promise<Uint8Array> {
  const operations = {
    resize: {
      method: "fit",
      width: maxWidth,
      height: 10000  // Large height to maintain aspect ratio
    },
    convert: {
      type: ["image/avif"]
    }
  };

  const convertResponse = await fetch(outputUrl, {
    method: "POST",
    headers: {
      "Authorization": auth,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(operations)
  });

  if (!convertResponse.ok) {
    const errorText = await convertResponse.text();
    throw new Error(`TinyPNG conversion failed: ${convertResponse.status} - ${errorText}`);
  }

  const avifData = await convertResponse.arrayBuffer();
  return new Uint8Array(avifData);
}

serve(async (req) => {
  console.log(`Request: ${req.method} ${req.url}`);
  
  // CORS
  if (req.method === "OPTIONS") {
    console.log("CORS preflight request");
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-password",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    console.log("Initializing Supabase client...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing env vars:", { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey });
      return jsonResponse({ 
        success: false, 
        error: "Server configuration error" 
      }, 500);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase client initialized");

    // LIST - Get all images (PUBLIC - no password required)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const category = url.searchParams.get("category");

      let query = supabase
        .from("gallery_images")
        .select("*")
        .order("created_at", { ascending: false });

      if (category && ALLOWED_CATEGORIES.includes(category)) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching images:", error);
        return jsonResponse({ 
          success: false, 
          error: "Klaida gaunant nuotraukas", 
          details: error.message 
        }, 500);
      }

      return jsonResponse({ success: true, data });
    }

    // Verify password for POST/DELETE operations
    const password = req.headers.get("x-password");
    if (!password) {
      return jsonResponse({ success: false, error: "Nėra autorizacijos" }, 401);
    }

    const { data: passwordData, error: passwordError } = await supabase
      .from("control_password")
      .select("password")
      .single();

    if (passwordError) {
      console.error("Password fetch error:", passwordError);
      return jsonResponse({ 
        success: false, 
        error: "Klaida tikrinant slaptažodį", 
        details: passwordError.message 
      }, 500);
    }

    if (!passwordData || passwordData.password !== password) {
      console.error("Password mismatch:", { received: password, expected: passwordData?.password });
      return jsonResponse({ success: false, error: "Neteisingas slaptažodis" }, 401);
    }

    // UPLOAD - New image
    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") || "";
      
      // Handle DELETE action
      if (contentType.includes("application/json")) {
        const body = await req.json();
        
        if (body.action === "delete") {
          const { id } = body;
          
          if (!id) {
            return jsonResponse({ success: false, error: "ID nenurodytas" }, 400);
          }

          // Get image data
          const { data: imageData, error: fetchError } = await supabase
            .from("gallery_images")
            .select("storage_path, thumbnail_path, thumbnail_small_path")
            .eq("id", id)
            .single();

          if (fetchError || !imageData) {
            return jsonResponse({ success: false, error: "Nuotrauka nerasta" }, 404);
          }

          // Delete from storage (main + both thumbnails)
          const pathsToDelete = [imageData.storage_path];
          if (imageData.thumbnail_path) pathsToDelete.push(imageData.thumbnail_path);
          if (imageData.thumbnail_small_path) pathsToDelete.push(imageData.thumbnail_small_path);
          
          await supabase.storage.from("gallery-images").remove(pathsToDelete);

          // Delete from database
          const { error: deleteError } = await supabase
            .from("gallery_images")
            .delete()
            .eq("id", id);

          if (deleteError) {
            console.error("Error deleting image:", deleteError);
            return jsonResponse({ success: false, error: "Klaida trinant nuotrauką" }, 500);
          }

          return jsonResponse({ success: true, message: "Nuotrauka ištrinta" });
        }
      }

      // Handle file upload (receives original JPG/PNG from frontend)
      if (!contentType.includes("multipart/form-data")) {
        return jsonResponse({ success: false, error: "Netinkamas content type" }, 400);
      }

      const formData = await req.formData();
      const imageFile = formData.get("image") as File;
      const category = formData.get("category") as string;
      const title = formData.get("title") as string || null;
      const description = formData.get("description") as string || null;
      const originalWidth = formData.get("width") as string;
      const originalHeight = formData.get("height") as string;

      if (!imageFile) {
        return jsonResponse({ success: false, error: "Nėra failo" }, 400);
      }

      if (!category || !ALLOWED_CATEGORIES.includes(category)) {
        return jsonResponse({ success: false, error: "Neteisinga kategorija" }, 400);
      }

      if (!originalWidth || !originalHeight) {
        return jsonResponse({ success: false, error: "Nenurodyta nuotraukos dimensijos" }, 400);
      }

      // Get original image data
      const originalData = new Uint8Array(await imageFile.arrayBuffer());
      const originalSize = originalData.byteLength;

      console.log(`Compressing image: ${imageFile.name} (${Math.round(originalSize/1024)}KB)`);

      try {
        const tinifyApiKey = Deno.env.get("TINIFY_API_KEY");
        if (!tinifyApiKey) {
          throw new Error("TINIFY_API_KEY not configured");
        }

        const auth = "Basic " + btoa(`api:${tinifyApiKey}`);

        // Step 1: Upload and compress once (1 API call)
        const uploadResponse = await fetch("https://api.tinify.com/shrink", {
          method: "POST",
          headers: {
            "Authorization": auth,
          },
          body: originalData
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`TinyPNG upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        const outputUrl = uploadResult.output.url;
        
        // Get compression count from TinyPNG API (this is month total AFTER this shrink request)
        // We use 4 API calls total per upload: 1 shrink + 3 resize/convert operations
        const monthTotalAfterShrink = uploadResponse.headers.get("compression-count") || "?";
        const thisUploadCost = 4; // 1 shrink + 3 resize ops
        const monthTotalAfterUpload = monthTotalAfterShrink !== "?" 
          ? (parseInt(monthTotalAfterShrink) + 3).toString() 
          : "?";
        console.log(`TinyPNG API usage: ${thisUploadCost} calls for this upload, ${monthTotalAfterUpload} total this month`);

        // Step 2: Resize and convert to 3 sizes in parallel (3 API calls)
        const [mainAvif, thumbAvif, thumbSmallAvif] = await Promise.all([
          resizeAndConvertToAVIF(outputUrl, auth, 1920),
          resizeAndConvertToAVIF(outputUrl, auth, 400),
          resizeAndConvertToAVIF(outputUrl, auth, 200)
        ]);

        console.log(`Compressed sizes: main=${Math.round(mainAvif.byteLength/1024)}KB, thumb=${Math.round(thumbAvif.byteLength/1024)}KB, small=${Math.round(thumbSmallAvif.byteLength/1024)}KB`);

        // Generate filenames
        const timestamp = Date.now();
        const folderName = CATEGORY_FOLDERS[category];
        const mainPath = `${folderName}/${timestamp}.avif`;
        const thumbPath = `${folderName}/${timestamp}_thumb.avif`;
        const thumbSmallPath = `${folderName}/${timestamp}_thumb_small.avif`;

        // Upload main image to storage
        const { error: uploadError } = await supabase.storage
          .from("gallery-images")
          .upload(mainPath, mainAvif, {
            contentType: "image/avif",
            cacheControl: "31536000", // 1 year
          });

        if (uploadError) {
          console.error("Error uploading image:", uploadError);
          return jsonResponse({ success: false, error: "Klaida įkeliant nuotrauką", details: uploadError.message }, 500);
        }

        // Upload thumbnails (with error handling)
        const { error: thumbError } = await supabase.storage
          .from("gallery-images")
          .upload(thumbPath, thumbAvif, {
            contentType: "image/avif",
            cacheControl: "31536000",
          });

        if (thumbError) {
          console.error("Error uploading thumbnail:", thumbError);
          // Cleanup main image
          await supabase.storage.from("gallery-images").remove([mainPath]);
          return jsonResponse({ success: false, error: "Klaida įkeliant thumbnail", details: thumbError.message }, 500);
        }

        const { error: thumbSmallError } = await supabase.storage
          .from("gallery-images")
          .upload(thumbSmallPath, thumbSmallAvif, {
            contentType: "image/avif",
            cacheControl: "31536000",
          });

        if (thumbSmallError) {
          console.error("Error uploading small thumbnail:", thumbSmallError);
          // Cleanup main + thumbnail
          await supabase.storage.from("gallery-images").remove([mainPath, thumbPath]);
          return jsonResponse({ success: false, error: "Klaida įkeliant mažą thumbnail", details: thumbSmallError.message }, 500);
        }

        // Calculate dimensions based on original image and resize ratios
        const origWidth = parseInt(originalWidth);
        const origHeight = parseInt(originalHeight);
        const aspectRatio = origWidth / origHeight;
        
        // Main image dimensions (max 1920px wide)
        const width = Math.min(origWidth, 1920);
        const height = Math.round(width / aspectRatio);
        
        // Thumbnail dimensions (400px wide)
        const thumbWidth = Math.min(origWidth, 400);
        const thumbHeight = Math.round(thumbWidth / aspectRatio);
        
        // Small thumbnail dimensions (200px wide)
        const thumbSmallWidth = Math.min(origWidth, 200);
        const thumbSmallHeight = Math.round(thumbSmallWidth / aspectRatio);

        // Save metadata to database
        const { data: insertedData, error: dbError } = await supabase
          .from("gallery_images")
          .insert({
            filename: imageFile.name,
            storage_path: mainPath,
            thumbnail_path: thumbPath,
            thumbnail_small_path: thumbSmallPath,
            category,
            title,
            description,
            file_size: mainAvif.byteLength,
            original_size: originalSize,
            width,
            height,
            thumbnail_width: thumbWidth,
            thumbnail_height: thumbHeight,
            thumbnail_small_width: thumbSmallWidth,
            thumbnail_small_height: thumbSmallHeight,
          })
          .select()
          .single();

        if (dbError) {
          console.error("Error saving to database:", dbError);
          // Try to cleanup uploaded files
          await supabase.storage.from("gallery-images").remove([mainPath, thumbPath, thumbSmallPath]);
          return jsonResponse({ success: false, error: "Klaida saugant į duomenų bazę" }, 500);
        }

        const totalSize = mainAvif.byteLength + thumbAvif.byteLength + thumbSmallAvif.byteLength;
        const compressionRatio = ((1 - (totalSize / originalSize)) * 100).toFixed(1);
        
        return jsonResponse({
          success: true,
          message: "Nuotrauka įkelta ir sėkmingai suskompriuota į AVIF",
          data: {
            ...insertedData,
            originalSize,
            compressedSize: totalSize,
            compressionRatio: `${compressionRatio}%`,
            tinypng: true,
            apiUsage: {
              thisUpload: thisUploadCost,
              monthTotal: monthTotalAfterUpload
            }
          }
        });
      } catch (tinifyError) {
        console.error("TinyPNG compression error:", tinifyError);
        return jsonResponse({ 
          success: false, 
          error: "Klaida kompriuojant nuotrauką", 
          details: tinifyError.message 
        }, 500);
      }
    }

    return jsonResponse({ success: false, error: "Nežinomas veiksmas" }, 400);

  } catch (error) {
    console.error("Function error:", error);
    return jsonResponse({ success: false, error: `Serverio klaida: ${error.message}` }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-password, Authorization, apikey",
    },
  });
}
