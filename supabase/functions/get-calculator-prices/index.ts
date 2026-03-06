import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// Default fallback prices (used if DB fetch fails)
const DEFAULTS = {
  painting_base:        9,  // €/m² base painting price (dark RAL)
  color_light_ral:      1,  // addon for light RAL
  color_metallic:       2,  // addon for metallic/pearlescent
  color_ncs:            4,  // addon for NCS / special
  sandblasting:         10,  // €/m² sandblasting
  primer:               9,  // €/m² primer
  min_order:           15,  // € minimum order
};

// Mapping: admin_settings key → internal price key
const KEY_MAP: Record<string, string> = {
  painting_price:          'painting_base',
  priming_price:           'primer',
  sandblasting_price:      'sandblasting',
  minimum_charge:          'min_order',
  calc_price_color_light_ral_addon:  'color_light_ral',
  calc_price_color_metallic_addon:   'color_metallic',
  calc_price_color_ncs_addon:        'color_ncs',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
    const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify(DEFAULTS), { headers: CORS_HEADERS });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const keys = [
      "painting_price",
      "priming_price",
      "sandblasting_price",
      "minimum_charge",
      "calc_price_color_light_ral_addon",
      "calc_price_color_metallic_addon",
      "calc_price_color_ncs_addon",
    ];

    const { data, error } = await supabase
      .from("admin_settings")
      .select("setting_key, setting_value")
      .in("setting_key", keys);

    if (error) {
      return new Response(JSON.stringify(DEFAULTS), { headers: CORS_HEADERS });
    }

    // Map DB rows using KEY_MAP, fall back to defaults where missing
    const db: Record<string, number> = {};
    for (const row of data ?? []) {
      // setting_value is JSONB - may be number, string, or quoted string like "9.0"
      const raw = typeof row.setting_value === 'string'
        ? row.setting_value.replace(/^"|"$/g, '')
        : String(row.setting_value);
      const val = parseFloat(raw);
      const internalKey = KEY_MAP[row.setting_key];
      if (internalKey && !isNaN(val)) db[internalKey] = val;
    }

    const prices = {
      painting_base:    db["painting_base"]    ?? DEFAULTS.painting_base,
      color_light_ral:  db["color_light_ral"]  ?? DEFAULTS.color_light_ral,
      color_metallic:   db["color_metallic"]   ?? DEFAULTS.color_metallic,
      color_ncs:        db["color_ncs"]        ?? DEFAULTS.color_ncs,
      sandblasting:     db["sandblasting"]     ?? DEFAULTS.sandblasting,
      primer:           db["primer"]           ?? DEFAULTS.primer,
      min_order:        db["min_order"]        ?? DEFAULTS.min_order,
    };

    return new Response(JSON.stringify(prices), { headers: CORS_HEADERS });

  } catch (err) {
    // On any error, return safe defaults so the calculator still works
    return new Response(JSON.stringify(DEFAULTS), { headers: CORS_HEADERS });
  }
});
