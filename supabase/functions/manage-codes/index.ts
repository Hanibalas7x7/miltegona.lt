import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Rate limiting: 60 requests per hour per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

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
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

    // Verify session token
    const authHeader = req.headers.get("x-session-token");
    if (!authHeader) {
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

    const { method, body } = await parseRequest(req);

    // LIST - Get all codes
    if (method === "GET") {
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
