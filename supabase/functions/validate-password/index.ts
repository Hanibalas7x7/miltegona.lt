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

// Parse client IP from headers
function getClientIP(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const clientIp = xff.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return clientIp;
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false; // Rate limit exceeded
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
        "Access-Control-Allow-Headers": "Content-Type, x-password, Authorization, apikey",
      },
    });
  }

  try {
    // Get client IP for rate limiting
    const clientIp = getClientIP(req);

    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Per daug bandymų. Bandykite vėliau.",
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

    // Get password from header (not body - more secure)
    const password = req.headers.get("x-password");

    if (!password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Slaptažodis nenurodytas",
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check password against ADMIN_PASSWORD env var
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    if (!adminPassword) {
      console.error("ADMIN_PASSWORD not configured");
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
      console.error(`Password mismatch from IP: ${clientIp}`);
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

    // Password is correct
    return new Response(
      JSON.stringify({
        success: true,
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
