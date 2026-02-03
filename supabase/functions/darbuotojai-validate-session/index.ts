// Edge Function: darbuotojai-validate-session
// Validate session token and return user info

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting - 60 requests per hour per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: 'Per daug bandymų. Bandykite vėliau.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header privalomas' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    // Create Supabase client with service_role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(sessionToken);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Netinkama sesija' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get app_user record
    const { data: appUser, error: appUserError } = await supabaseAdmin
      .from('app_users')
      .select('id, role, darbuotojas_id, darbuotojai:darbuotojas_id(id, vardas, pavarde)')
      .eq('email', user.email)
      .single();

    if (appUserError || !appUser || appUser.role !== 'employee') {
      return new Response(
        JSON.stringify({ error: 'Vartotojas nerastas arba neturi prieigos' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!appUser.darbuotojai) {
      return new Response(
        JSON.stringify({ error: 'Darbuotojas nerastas' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return user info
    return new Response(
      JSON.stringify({
        user: {
          id: appUser.id,
          darbuotojasId: appUser.darbuotojas_id,
          vardas: appUser.darbuotojai.vardas,
          pavarde: appUser.darbuotojai.pavarde,
          email: user.email,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Session validation error:', error);
    return new Response(
      JSON.stringify({ error: 'Serverio klaida' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
