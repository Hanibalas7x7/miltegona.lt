// Edge Function: add-paint
// Adds new paint to added_paints and logs to paint_changes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

interface PaintData {
  gamintojas: string;
  kodas: string;
  spalva: string;
  gruntas?: string;
  blizgumas: string;
  pavirsus: string;
  effect: string;
  sudetis: string;
  kiekis: number;
  ml_kodas: string;
  kaina?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header privalomas' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Initialize Supabase client with SERVICE_ROLE_KEY
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get paint data from request body
    const paintData: PaintData = await req.json();

    // Validate required fields
    if (!paintData.gamintojas || !paintData.kodas || !paintData.spalva || 
        !paintData.blizgumas || !paintData.pavirsus || !paintData.effect || 
        !paintData.sudetis || !paintData.kiekis || !paintData.ml_kodas) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate ML code format (ML + number)
    if (!/^ML\d+$/.test(paintData.ml_kodas)) {
      return new Response(
        JSON.stringify({ error: 'Invalid ML code format. Must be ML followed by numbers (e.g., ML241)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if ML code already exists
    const { data: existingPaint } = await supabase
      .from('added_paints')
      .select('ml_kodas')
      .eq('ml_kodas', paintData.ml_kodas)
      .single();

    if (existingPaint) {
      return new Response(
        JSON.stringify({ error: `ML kodas ${paintData.ml_kodas} jau egzistuoja` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new paint to added_paints
    const { data: newPaint, error: insertError } = await supabase
      .from('added_paints')
      .insert([paintData])
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: `Failed to add paint: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to paint_changes with FULL SNAPSHOT (same as Miltegona_Manager)
    // For new paints: old_weight = 0 (or NULL)
    const changeLog = {
      ml_code: paintData.ml_kodas,
      old_weight: 0,  // Can be 0 or null for new paints
      new_weight: paintData.kiekis,
      gamintojas: paintData.gamintojas,  // NOT NULL - required
      kodas: paintData.kodas || null,
      spalva: paintData.spalva || null,
      gruntas: paintData.gruntas || null,
      blizgumas: paintData.blizgumas || null,
      pavirsus: paintData.pavirsus || null,
      effect: paintData.effect || null,
      sudetis: paintData.sudetis || null,
      kaina: paintData.kaina || null,
    };

    const { error: logError } = await supabase
      .from('paint_changes')
      .insert([changeLog]);

    if (logError) {
      console.error('Log error:', logError);
      // Don't fail the request if logging fails, but log the error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        paint: newPaint,
        message: 'Dažai sėkmingai pridėti'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
