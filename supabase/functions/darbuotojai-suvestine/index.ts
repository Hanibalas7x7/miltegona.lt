// Edge Function: darbuotojai-suvestine
// Get employee's work hours summary for a specific month

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
      return new Response(
        JSON.stringify({ error: 'Vartotojas nerastas arba neturi prieigos' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate date range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get work hours for this employee and month
    const { data: workHours, error: workHoursError } = await supabaseAdmin
      .from('darbuotoju_darbo_valandos')
      .select('*')
      .eq('darbuotojas_id', appUser.darbuotojas_id)
      .gte('data', startDateStr)
      .lte('data', endDateStr)
      .order('data', { ascending: true });

    if (workHoursError) {
      throw workHoursError;
    }

    // Calculate total hours and format records
    let totalHours = 0;
    const records = (workHours || []).map(record => {
      // Calculate hours: (end - start)
      let hours = 0;
      if (record.pradzios_laikas && record.pabaigos_laikas) {
        // Extract time part (HH:MM:SS) from timestamp
        const startTime = record.pradzios_laikas.includes('T') 
          ? record.pradzios_laikas.split('T')[1].split('+')[0].split('Z')[0]
          : record.pradzios_laikas;
        const endTime = record.pabaigos_laikas.includes('T')
          ? record.pabaigos_laikas.split('T')[1].split('+')[0].split('Z')[0]
          : record.pabaigos_laikas;
        
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        hours = (end - start) / (1000 * 60 * 60);
      }
      
      totalHours += hours;
      
      return {
        data: record.data,
        pradzios_laikas: record.pradzios_laikas,
        pabaigos_laikas: record.pabaigos_laikas,
        pietu_pertrauka: record.pietu_pertrauka || 0,
        valandos: hours,
      };
    });

    return new Response(
      JSON.stringify({
        records,
        totalHours,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Suvestine error:', error);
    return new Response(
      JSON.stringify({ error: 'Serverio klaida' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
