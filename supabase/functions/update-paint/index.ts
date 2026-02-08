// Edge Function: update-paint
// Updates paint parameters in added_paints and logs to paint_changes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

interface UpdatePaintData {
  ml_kodas: string;
  gamintojas?: string;
  kodas?: string;
  spalva?: string;
  gruntas?: string;
  blizgumas?: string;
  pavirsus?: string;
  effect?: string;
  sudetis?: string;
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

    // Get update data from request body
    const updateData: UpdatePaintData = await req.json();

    // Validate ml_kodas
    if (!updateData.ml_kodas) {
      return new Response(
        JSON.stringify({ error: 'Missing ml_kodas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current paint data
    const { data: currentPaint, error: fetchError } = await supabase
      .from('added_paints')
      .select('*')
      .eq('ml_kodas', updateData.ml_kodas)
      .single();

    if (fetchError || !currentPaint) {
      return new Response(
        JSON.stringify({ error: `Dažai su ML kodu ${updateData.ml_kodas} nerasti` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare update object (only include fields that are provided)
    const updates: Record<string, any> = {};
    if (updateData.gamintojas !== undefined) updates.gamintojas = updateData.gamintojas;
    if (updateData.kodas !== undefined) updates.kodas = updateData.kodas;
    if (updateData.spalva !== undefined) updates.spalva = updateData.spalva;
    if (updateData.gruntas !== undefined) updates.gruntas = updateData.gruntas;
    if (updateData.blizgumas !== undefined) updates.blizgumas = updateData.blizgumas;
    if (updateData.pavirsus !== undefined) updates.pavirsus = updateData.pavirsus;
    if (updateData.effect !== undefined) updates.effect = updateData.effect;
    if (updateData.sudetis !== undefined) updates.sudetis = updateData.sudetis;
    if (updateData.kaina !== undefined) updates.kaina = updateData.kaina;

    // If no fields to update
    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No fields to update' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update paint in added_paints
    const { data: updatedPaint, error: updateError } = await supabase
      .from('added_paints')
      .update(updates)
      .eq('ml_kodas', updateData.ml_kodas)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: `Failed to update paint: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to paint_changes with FULL SNAPSHOT (same as Miltegona_Manager)
    // Weight unchanged - this is parameter edit only
    const changeLog = {
      ml_code: updateData.ml_kodas,
      old_weight: currentPaint.kiekis,
      new_weight: currentPaint.kiekis,  // Weight unchanged in this operation
      gamintojas: updatedPaint.gamintojas,  // NOT NULL - required field
      kodas: updatedPaint.kodas || null,
      spalva: updatedPaint.spalva || null,
      gruntas: updatedPaint.gruntas || null,
      blizgumas: updatedPaint.blizgumas || null,
      pavirsus: updatedPaint.pavirsus || null,
      effect: updatedPaint.effect || null,
      sudetis: updatedPaint.sudetis || null,
      kaina: updatedPaint.kaina || null,
    };

    const { error: logError } = await supabase
      .from('paint_changes')
      .insert([changeLog]);

    if (logError) {
      console.error('Log error:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        paint: updatedPaint,
        message: 'Dažai sėkmingai atnaujinti'
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
