import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// Reports whether the phone really executed an open_gate command.
// With cancel=true a still-pending command is marked failed so the phone
// won't call the gate later, when nobody is waiting for it any more.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { code, commandId, cancel } = await req.json();

    if (!code || !Number.isInteger(commandId)) {
      return json({ success: false, error: "Neteisinga užklausa" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: gateCode } = await supabase
      .from("gate_codes")
      .select("code")
      .eq("code", code)
      .maybeSingle();

    if (!gateCode) {
      return json({ success: false, error: "Neteisingas kodas" }, 404);
    }

    const { data: command, error } = await supabase
      .from("gate_commands")
      .select("id, status, response")
      .eq("id", commandId)
      .eq("command", "open_gate")
      .eq("device_id", "gate_opener_1")
      .maybeSingle();

    if (error || !command) {
      return json({ success: false, error: "Komanda nerasta" }, 404);
    }

    if (command.status === "pending" && cancel === true) {
      const { data: cancelled } = await supabase
        .from("gate_commands")
        .update({
          status: "failed",
          response: "timeout: telefonas neatsiliepė",
          executed_at: new Date().toISOString(),
        })
        .eq("id", commandId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (cancelled) {
        return json({ success: true, status: "timeout" });
      }

      // The phone finished between our read and the update - report the real result
      const { data: latest } = await supabase
        .from("gate_commands")
        .select("status")
        .eq("id", commandId)
        .single();
      return json({ success: true, status: latest?.status ?? "failed" });
    }

    return json({ success: true, status: command.status });
  } catch (error) {
    console.error("Function error:", error);
    return json({ success: false, error: "Serverio klaida" }, 500);
  }
});
