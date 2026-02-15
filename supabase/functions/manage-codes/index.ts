import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Rate limiting: 60 requests per hour per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// Timing-safe password comparison (XOR-based, prevents timing attacks)
function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);

  // Always iterate over the max length to reduce timing leakage
  const len = Math.max(ea.length, eb.length);
  let diff = ea.length ^ eb.length;

  for (let i = 0; i < len; i++) {
    const va = ea[i] ?? 0;
    const vb = eb[i] ?? 0;
    diff |= va ^ vb;
  }
  return diff === 0;
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-password",
      },
    });
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Per daug užklausų. Bandykite vėliau.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Initialize Supabase client with SERVICE_ROLE_KEY
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify password on every request
    const password = req.headers.get("x-password");
    if (!password || password.trim() === "") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Nėra autorizacijos",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Check password against ADMIN_PASSWORD env var
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    if (!adminPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Serverio konfigūracijos klaida",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Validate password with timing-safe comparison
    const passwordMatch = timingSafeEqual(password, adminPassword);
    if (!passwordMatch) {
      // Small delay to slow down brute force attempts
      await new Promise(resolve => setTimeout(resolve, 250));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Neteisingas slaptažodis",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const { method, body } = await parseRequest(req);

    // LIST - Get all codes
    if (method === "GET") {
      // Cleanup: Delete codes that expired more than 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString();
      
      await supabase
        .from("gate_codes")
        .delete()
        .eq("unlimited", false)
        .lt("valid_to", sevenDaysAgoStr);
      
      // Get remaining codes
      const { data, error } = await supabase
        .from("gate_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching codes:", error);
        return jsonResponse({ success: false, error: "Klaida gaunant kodus" }, 500);
      }

      return jsonResponse({ success: true, data });
    }

    // CREATE - Generate new code
    if (method === "POST" && body.action === "create") {
      const { code, valid_from, valid_to, unlimited, note } = body;

      const { error } = await supabase
        .from("gate_codes")
        .insert([{
          code,
          valid_from,
          valid_to,
          unlimited,
          note: note || null,
        }]);

      if (error) {
        console.error("Error creating code:", error);
        return jsonResponse({ success: false, error: "Klaida kuriant kodą" }, 500);
      }

      return jsonResponse({ success: true, message: "Kodas sukurtas" });
    }

    // DELETE - Remove code
    if (method === "DELETE" || (method === "POST" && body.action === "delete")) {
      const { id } = body;

      if (!id) {
        return jsonResponse({ success: false, error: "ID nenurodytas" }, 400);
      }

      const { error } = await supabase
        .from("gate_codes")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting code:", error);
        return jsonResponse({ success: false, error: "Klaida trinant kodą" }, 500);
      }

      return jsonResponse({ success: true, message: "Kodas ištrintas" });
    }

    // UPDATE - Edit code validity
    if (method === "POST" && body.action === "update") {
      const { id, valid_from, valid_to, unlimited, note } = body;

      if (!id) {
        return jsonResponse({ success: false, error: "ID nenurodytas" }, 400);
      }

      // Build update data - only include fields that are explicitly provided
      const updateData: any = {};
      
      // Only update unlimited if explicitly provided as boolean
      if (typeof unlimited === "boolean") {
        updateData.unlimited = unlimited;
      }
      
      // Only update note if provided (null is valid to clear note)
      if (note !== undefined) {
        updateData.note = note || null;
      }

      // If not unlimited, require dates
      if (unlimited === false) {
        if (!valid_from || !valid_to) {
          return jsonResponse({ success: false, error: "Reikalingos galiojimo datos" }, 400);
        }
        updateData.valid_from = valid_from;
        updateData.valid_to = valid_to;
      } else if (unlimited === true) {
        // If explicitly set to unlimited, clear dates
        updateData.valid_from = null;
        updateData.valid_to = null;
      }

      const { error } = await supabase
        .from("gate_codes")
        .update(updateData)
        .eq("id", id);

      if (error) {
        console.error("Error updating code:", error);
        return jsonResponse({ success: false, error: "Klaida atnaujinant kodą" }, 500);
      }

      return jsonResponse({ success: true, message: "Kodas atnaujintas" });
    }

    return jsonResponse({ success: false, error: "Nežinomas veiksmas" }, 400);

  } catch (error) {
    console.error("Function error:", error);
    return jsonResponse({ success: false, error: "Serverio klaida" }, 500);
  }
});

async function parseRequest(req: Request) {
  const method = req.method;
  let body = {};
  
  if (method === "POST" || method === "DELETE") {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }
  
  return { method, body };
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
