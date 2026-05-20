// Edge Function: darbuotojai-clock
// Clock in / clock out for employees

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header privalomas' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate session
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(sessionToken);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Netinkama sesija' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get app_user
    const { data: appUser, error: appUserError } = await supabaseAdmin
      .from('app_users')
      .select('darbuotojas_id, role')
      .eq('email', user.email)
      .single();

    if (appUserError || !appUser || (appUser.role !== 'employee' && appUser.role !== 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Prieiga neleista' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!appUser.darbuotojas_id) {
      return new Response(
        JSON.stringify({ error: 'Darbuotojo įrašas nerastas' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, localDate } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Veiksmas nenurodytas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // localDate: YYYY-MM-DD (client's local date in Lithuanian timezone)
    // Fall back to UTC date if not provided
    const today = localDate || new Date().toISOString().split('T')[0];

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
      return new Response(
        JSON.stringify({ error: 'Neteisinga datos formato' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const darbuotojasId = appUser.darbuotojas_id;

    // --- STATUS ---
    if (action === 'status') {
      const { data: record } = await supabaseAdmin
        .from('darbuotoju_darbo_valandos')
        .select('id, pradzios_laikas, pabaigos_laikas')
        .eq('darbuotojas_id', darbuotojasId)
        .eq('data', today)
        .maybeSingle();

      return new Response(
        JSON.stringify({ success: true, record: record || null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- CLOCK IN ---
    if (action === 'clock_in') {
      // Check if already clocked in today
      const { data: existing } = await supabaseAdmin
        .from('darbuotoju_darbo_valandos')
        .select('id, pradzios_laikas, pabaigos_laikas')
        .eq('darbuotojas_id', darbuotojasId)
        .eq('data', today)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: 'Šiandien jau pažymėjote atvykimą' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const now = new Date().toISOString();

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('darbuotoju_darbo_valandos')
        .insert({
          darbuotojas_id: darbuotojasId,
          data: today,
          pradzios_laikas: now,
          pabaigos_laikas: null,
          // pietu_pertrauka uses DB default (1.0 val.)
        })
        .select('id, pradzios_laikas, pabaigos_laikas')
        .single();

      if (insertError) {
        console.error('Clock in error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Klaida žymint atvykimą' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, record: inserted }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- CLOCK OUT ---
    if (action === 'clock_out') {
      const { data: existing } = await supabaseAdmin
        .from('darbuotoju_darbo_valandos')
        .select('id, pradzios_laikas, pabaigos_laikas')
        .eq('darbuotojas_id', darbuotojasId)
        .eq('data', today)
        .maybeSingle();

      if (!existing) {
        return new Response(
          JSON.stringify({ error: 'Šiandien nepažymėjote atvykimo' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existing.pabaigos_laikas) {
        return new Response(
          JSON.stringify({ error: 'Šiandien jau pažymėjote išvykimą' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const now = new Date().toISOString();

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('darbuotoju_darbo_valandos')
        .update({ pabaigos_laikas: now })
        .eq('id', existing.id)
        .select('id, pradzios_laikas, pabaigos_laikas')
        .single();

      if (updateError) {
        console.error('Clock out error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Klaida žymint išvykimą' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, record: updated }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Nežinomas veiksmas' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Clock function error:', error);
    return new Response(
      JSON.stringify({ error: 'Serverio klaida' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
