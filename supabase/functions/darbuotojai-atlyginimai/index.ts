// Edge Function: darbuotojai-atlyginimai
// Get employee's salary calculation for a specific month

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

    const { year, month } = await req.json();

    if (!year || !month) {
      return new Response(
        JSON.stringify({ error: 'Metai ir mėnuo privalomi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Get app_user to get darbuotojas_id
    const { data: appUser, error: appUserError } = await supabaseAdmin
      .from('app_users')
      .select('darbuotojas_id, role')
      .eq('email', user.email)
      .single();

    if (appUserError || !appUser || appUser.role !== 'employee') {
      console.log('App user error:', appUserError?.message, 'User email:', user.email);
      return new Response(
        JSON.stringify({ error: 'Vartotojas nerastas arba neturi prieigos' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get calculated salary data from menesio_atlyginimai table
    const { data: atlyginimas, error: atlyginimasError } = await supabaseAdmin
      .from('menesio_atlyginimai')
      .select('*')
      .eq('darbuotojas_id', appUser.darbuotojas_id)
      .eq('metai', year)
      .eq('menuo', month)
      .maybeSingle();

    if (atlyginimasError) {
      console.log('Atlyginimas query error:', atlyginimasError.message);
      throw atlyginimasError;
    }

    if (!atlyginimas) {
      // Return empty data if no record found
      return new Response(
        JSON.stringify({
          salary: {
            norminesDarboDienos: 0,
            pradirbtaDienu: 0,
            norminesValandos: 0,
            pradirbtoValandu: 0,
            brutoAntPopieriaus: 0,
            pritaikytasNPD: 0,
            gpm: 0,
            sodraDarbuotojo: 0,
            sodraDarbdavio: 0,
            neto: 0,
            avansuSuma: 0,
            priedas: 0,
            likutis: 0,
            darboVietosKaina: 0,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return salary info from database
    return new Response(
      JSON.stringify({
        salary: {
          norminesDarboDienos: atlyginimas.normines_darbo_dienos || 0,
          pradirbtaDienu: atlyginimas.pradirbta_dienu || 0,
          norminesValandos: atlyginimas.normines_valandos || 0,
          pradirbtoValandu: atlyginimas.pradirbta_valandy || 0,
          brutoAntPopieriaus: atlyginimas.bruto_ant_popieriaus || 0,
          pritaikytasNPD: atlyginimas.pritaikytas_npd || 0,
          gpm: atlyginimas.gpm || 0,
          sodraDarbuotojo: atlyginimas.sodra_darbuotojo || 0,
          sodraDarbdavio: atlyginimas.sodra_darbdavio || 0,
          neto: atlyginimas.neto || 0,
          avansuSuma: atlyginimas.avansu_suma || 0,
          priedas: atlyginimas.priedas || 0,
          likutis: atlyginimas.likutis || 0,
          darboVietosKaina: atlyginimas.darbo_vietos_kaina || 0,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Atlyginimai error:', error);
    return new Response(
      JSON.stringify({ error: 'Serverio klaida' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
