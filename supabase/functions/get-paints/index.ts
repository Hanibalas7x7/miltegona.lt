import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for read-only access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch paints data (read-only)
    const { data, error } = await supabaseClient
      .from('added_paints')
      .select('gamintojas, kodas, spalva, gruntas, blizgumas, pavirsus, effect, sudetis, kiekis, ml_kodas')
      .order('ml_kodas')

    if (error) {
      throw error
    }

    // Filter out empty records and primers (gruntas)
    const filteredData = data.filter((paint: any) => {
      // Exclude if gruntas field is not null and not empty
      if (paint.gruntas && paint.gruntas.trim() !== '') {
        return false;
      }
      // Keep if has manufacturer or color
      return (paint.gamintojas && paint.gamintojas.trim() !== '') ||
             (paint.spalva && paint.spalva.trim() !== '');
    })

    return new Response(
      JSON.stringify({ paints: filteredData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
