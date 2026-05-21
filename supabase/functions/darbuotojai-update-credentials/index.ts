// Edge Function: darbuotojai-update-credentials
// Allow authenticated employee to change their own email and/or password

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header privalomas' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    const { email, password } = await req.json();

    if (!email && !password) {
      return new Response(
        JSON.stringify({ error: 'Reikalingas bent el. paštas arba slaptažodis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password && password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Slaptažodis turi būti bent 6 simbolių' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate session token - get authenticated user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(sessionToken);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Netinkama sesija. Prisijunkite iš naujo.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update payload
    const updatePayload: { email?: string; password?: string } = {};
    if (email) updatePayload.email = email.toLowerCase().trim();
    if (password) updatePayload.password = password;

    // Update auth user (admin API - no email confirmation needed)
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      updatePayload
    );

    if (updateAuthError) {
      return new Response(
        JSON.stringify({ error: `Klaida atnaujinant: ${updateAuthError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If email changed, update app_users table too
    if (email) {
      const { error: tableError } = await supabaseAdmin
        .from('app_users')
        .update({ email: email.toLowerCase().trim() })
        .eq('id', user.id);

      if (tableError) {
        return new Response(
          JSON.stringify({ error: `Klaida atnaujinant el. paštą: ${tableError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
