// Supabase Edge Function - Code-based eWeLink Control
// Deploy: supabase functions deploy validate-code-control --no-verify-jwt
// Validates gate_codes and internally calls unified-control edge function

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Rate limiting: 60 requests per hour per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

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

/**
 * Internal call to unified-control edge function
 * Uses service role key - no anon key needed from client
 */
async function callUnifiedControl(action: string, deviceId?: string, state?: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const unifiedControlUrl = `${supabaseUrl}/functions/v1/unified-control`;
  
  const body: any = { action };
  if (deviceId) body.deviceId = deviceId;
  if (state) body.state = state;
  
  console.log('🔗 Calling unified-control:', action);
  
  const response = await fetch(unifiedControlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey, // Supabase requires apikey header
    },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  console.log('📡 Unified-control response:', data);
  
  return data;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Per daug užklausų. Bandykite vėliau.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request
    const { code, action, deviceId, state } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Kodas nenurodytas",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!action) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Veiksmas nenurodytas",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Whitelist of allowed actions - no custom device control
    const allowedActions = [
      'light_on',
      'light_off',
      'open_building_gate',
      'close_building_gate',
      'get_status', // Light status only
    ];

    if (!allowedActions.includes(action)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Neleidžiamas veiksmas",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate code
    const { data: gateCode, error: codeError } = await supabase
      .from("gate_codes")
      .select("*")
      .eq("code", code)
      .single();

    if (codeError || !gateCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Neteisingas kodas",
          errorType: "not_found"
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check validity period
    const now = new Date();
    
    if (!gateCode.unlimited) {
      const validFrom = new Date(gateCode.valid_from);
      const validTo = new Date(gateCode.valid_to);
      
      if (now < validFrom) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Kodas dar negalioja",
            errorType: "not_yet_valid",
            validFrom: gateCode.valid_from
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (now > validTo) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Kodo galiojimo laikas pasibaigė",
            errorType: "expired",
            validTo: gateCode.valid_to
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Code is valid - call unified-control edge function
    // For get_status, use hardcoded light device ID
    const lightDeviceId = '1001e7d80b';
    const finalDeviceId = action === 'get_status' ? lightDeviceId : undefined;
    
    const result = await callUnifiedControl(action, finalDeviceId);

    // Return result
    return new Response(
      JSON.stringify({
        success: result.success || false,
        message: result.message || (result.success ? 'Veiksmas atliktas' : 'Nepavyko atlikti veiksmo'),
        error: result.error,
        data: result,
      }),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
