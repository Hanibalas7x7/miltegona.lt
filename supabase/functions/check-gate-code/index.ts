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
        "Access-Control-Allow-Methods": "POST, OPTIONS",
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
          valid: false,
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

    // Parse request body
    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({
          success: false,
          valid: false,
          error: "Kodas nenurodytas",
        }),
        {
          status: 400,
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

    // Validate code in gate_codes table
    const { data: gateCode, error: codeError } = await supabase
      .from("gate_codes")
      .select("unlimited, valid_from, valid_to")
      .eq("code", code)
      .single();

    if (codeError || !gateCode) {
      return new Response(
        JSON.stringify({
          success: true,
          valid: false,
          reason: "Kodas nerastas sistemoje arba jau ištrintas",
          type: "not_found"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Check if code is still valid (date check)
    const now = new Date();
    
    if (gateCode.unlimited) {
      return new Response(
        JSON.stringify({
          success: true,
          valid: true,
          unlimited: true
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const validFrom = new Date(gateCode.valid_from);
    const validTo = new Date(gateCode.valid_to);
    
    if (now < validFrom) {
      return new Response(
        JSON.stringify({
          success: true,
          valid: false,
          reason: "⏳ Kodas dar negalioja.\n\nŠis kodas pradės galioti nuo: " + validFrom.toISOString(),
          type: "pending",
          validFrom: gateCode.valid_from
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
    
    if (now > validTo) {
      return new Response(
        JSON.stringify({
          success: true,
          valid: false,
          reason: "❌ Šio kodo galiojimo laikas pasibaigė: " + validTo.toISOString() + "\n\nKodas nebegalioja ir netrukus bus automatiškai ištrintas iš sistemos.",
          type: "expired",
          validTo: gateCode.valid_to
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Code is valid
    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        unlimited: false
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        valid: false,
        error: "Serverio klaida",
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
});
