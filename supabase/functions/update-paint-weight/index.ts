// Edge Function: update-paint-weight
// Updates paint weight/quantity (kiekis) in added_paints and logs to paint_changes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

interface UpdateWeightData {
  ml_kodas: string;
  new_weight: number;
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
    const { ml_kodas, new_weight }: UpdateWeightData = await req.json();

    // Validate input
    if (!ml_kodas || new_weight === undefined || new_weight === null) {
      return new Response(
        JSON.stringify({ error: 'Missing ml_kodas or new_weight' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new_weight < 0) {
      return new Response(
        JSON.stringify({ error: 'Weight cannot be negative' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current paint data
    const { data: currentPaint, error: fetchError } = await supabase
      .from('added_paints')
      .select('*')
      .eq('ml_kodas', ml_kodas)
      .single();

    if (fetchError || !currentPaint) {
      return new Response(
        JSON.stringify({ error: `Dažai su ML kodu ${ml_kodas} nerasti` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const oldWeight = currentPaint.kiekis || 0;

    // Special case: If new weight is 0, delete the paint entirely
    if (new_weight === 0) {
      // Log deletion to paint_changes with FULL SNAPSHOT before deleting
      const changeLog = {
        ml_code: ml_kodas,
        old_weight: oldWeight,
        new_weight: 0,  // Deleting - final weight is 0
        gamintojas: currentPaint.gamintojas,  // NOT NULL - required field
        kodas: currentPaint.kodas || null,
        spalva: currentPaint.spalva || null,
        gruntas: currentPaint.gruntas || null,
        blizgumas: currentPaint.blizgumas || null,
        pavirsus: currentPaint.pavirsus || null,
        effect: currentPaint.effect || null,
        sudetis: currentPaint.sudetis || null,
        kaina: currentPaint.kaina || null,
      };

      await supabase.from('paint_changes').insert([changeLog]);

      // Delete paint
      const { error: deleteError } = await supabase
        .from('added_paints')
        .delete()
        .eq('ml_kodas', ml_kodas);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        return new Response(
          JSON.stringify({ error: `Failed to delete paint: ${deleteError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          deleted: true,
          message: 'Dažai pašalinti (kiekis 0kg)'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update weight in added_paints
    const { data: updatedPaint, error: updateError } = await supabase
      .from('added_paints')
      .update({ kiekis: new_weight })
      .eq('ml_kodas', ml_kodas)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: `Failed to update weight: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to paint_changes with FULL SNAPSHOT (same as Miltegona_Manager)
    // This is weight change operation
    const changeLog = {
      ml_code: ml_kodas,
      old_weight: oldWeight,
      new_weight: new_weight,
      gamintojas: currentPaint.gamintojas,  // NOT NULL - required field
      kodas: currentPaint.kodas || null,
      spalva: currentPaint.spalva || null,
      gruntas: currentPaint.gruntas || null,
      blizgumas: currentPaint.blizgumas || null,
      pavirsus: currentPaint.pavirsus || null,
      effect: currentPaint.effect || null,
      sudetis: currentPaint.sudetis || null,
      kaina: currentPaint.kaina || null,
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
        old_weight: oldWeight,
        new_weight: new_weight,
        message: 'Dažų kiekis sėkmingai atnaujintas'
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
