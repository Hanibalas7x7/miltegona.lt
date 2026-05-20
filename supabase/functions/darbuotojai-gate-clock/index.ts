// Edge Function: darbuotojai-gate-clock
// Auto clock-in employee when they open gate with their personal code
// No session auth needed – gate code itself is the credential

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

function getVilniusDateTime(now: Date): { today: string; localDateTime: string } {
  // sv-SE locale reliably gives "YYYY-MM-DD HH:MM:SS" format
  const vilniusStr = now.toLocaleString("sv-SE", { timeZone: "Europe/Vilnius" });
  const parts = vilniusStr.split(" ");
  const today = parts[0];    // "2026-05-21"
  const timeStr = parts[1];  // "01:44:52"

  // Compute timezone offset: treat local time as UTC, compare to actual UTC
  const pseudoUTC = new Date(`${today}T${timeStr}Z`).getTime();
  const offsetMs = pseudoUTC - now.getTime();
  const offsetSign = offsetMs >= 0 ? "+" : "-";
  const offsetH = Math.floor(Math.abs(offsetMs) / 3600000);
  const offsetM = Math.floor((Math.abs(offsetMs) % 3600000) / 60000);
  const localDateTime = `${today}T${timeStr}${offsetSign}${String(offsetH).padStart(2, "0")}:${String(offsetM).padStart(2, "0")}`;

  return { today, localDateTime };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ success: false, error: "Kodas nenurodytas" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up gate code and its note
    const { data: gateCode } = await supabase
      .from("gate_codes")
      .select("note, unlimited, valid_from, valid_to")
      .eq("code", code)
      .maybeSingle();

    if (!gateCode) {
      return new Response(
        JSON.stringify({ success: false, error: "Kodas nerastas" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const note = gateCode.note?.trim();
    if (!note) {
      // No employee note – nothing to do
      return new Response(
        JSON.stringify({ success: false, noEmployee: true }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Split note: first word = vardas, rest = pavarde
    const spaceIdx = note.indexOf(" ");
    if (spaceIdx === -1) {
      return new Response(
        JSON.stringify({ success: false, error: "Nepavyko išskirti vardo ir pavardės" }),
        { status: 200, headers: corsHeaders }
      );
    }
    const vardas = note.substring(0, spaceIdx);
    const pavarde = note.substring(spaceIdx + 1);

    // Find active employee by name
    const { data: employee } = await supabase
      .from("darbuotojai")
      .select("id, vardas, pavarde")
      .eq("vardas", vardas)
      .eq("pavarde", pavarde)
      .eq("aktyvus", true)
      .maybeSingle();

    if (!employee) {
      console.log(`Auto clock-in: employee '${note}' not found`);
      return new Response(
        JSON.stringify({ success: false, error: `Darbuotojas '${note}' nerastas` }),
        { status: 200, headers: corsHeaders }
      );
    }

    const { today, localDateTime } = getVilniusDateTime(new Date());

    // Check if clocked in today (no clock-out yet)
    const { data: existing } = await supabase
      .from("darbuotoju_darbo_valandos")
      .select("id, pradzios_laikas, pabaigos_laikas")
      .eq("darbuotojas_id", employee.id)
      .eq("data", today)
      .maybeSingle();

    if (!existing) {
      // No clock-in today – nothing to do
      return new Response(
        JSON.stringify({ success: false, notClockedIn: true, employeeName: note }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (existing.pabaigos_laikas) {
      // Already clocked out
      return new Response(
        JSON.stringify({ success: true, alreadyClockedOut: true, employeeName: note }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Clock out
    const { error: updateError } = await supabase
      .from("darbuotoju_darbo_valandos")
      .update({ pabaigos_laikas: localDateTime })
      .eq("id", existing.id);

    if (updateError) {
      console.error("Auto clock-out update error:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Klaida žymint išvykimą" }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Auto clock-out: ${note} clocked out at ${localDateTime}`);
    return new Response(
      JSON.stringify({ success: true, alreadyClockedOut: false, employeeName: note }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Serverio klaida" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
