// Supabase Edge Function - Public gate-code-triggered device control
// Deploy: supabase functions deploy channel-device-control --no-verify-jwt
//
// Public-facing endpoint (no Authorization/JWT required, CORS open) that lets a
// caller in possession of a valid gate code trigger an eWeLink device (gate or
// light) directly, without needing a Supabase service-role key.
//
// Backend choice: the eWeLink cloud API is used while `service_health` says it works;
// when the health job marked it down, the local CUBE (via cube.miltegona.lt) is tried
// first. Either backend is used as the fallback for the other.
//
// Token handling: reads/refreshes eWeLink OAuth tokens from the `app_tokens`
// table (service = 'ewelink') - same shared token store used by unified-control.
// If the cached access_token is within 5 minutes of expiry (or already expired),
// automatically calls eWeLink's /v2/user/refresh endpoint using the stored
// refresh_token, then persists the new access_token/refresh_token pair back to
// app_tokens with a ~29 day validity window (2505600000 ms).
//
// Code validation: looks up the `gate_codes` table by `code`; either the code
// must be `unlimited`, or the current time must fall within
// [valid_from, valid_to].
//
// state: "on" | "off" switches the device; "status" reads current state via
// GET /v2/device/thing without switching anything (added 2026-09-24, self-host
// only as of this deploy - not yet pushed to the cloud project).
//
// Required secrets (all optional, have fallback defaults):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected by the runtime)
//   EWELINK_APPID   (default: "P8OjRMaJNI9SMhkd6icQ4Z3331UsowRG")
//   EWELINK_REGION  (default: "eu")
//   CUBE_URL, CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET, CUBE_PASSWORD (CUBE fallback)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { cubeGetPower, cubeSetPower } from "../_shared/cube.ts";
import { routed } from "../_shared/health.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const EWELINK_APPID = Deno.env.get("EWELINK_APPID") || "P8OjRMaJNI9SMhkd6icQ4Z3331UsowRG";
const API_BASE = `https://${Deno.env.get("EWELINK_REGION") || "eu"}-apia.coolkit.cc`;

function out(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Read current on/off state for a device (single-channel or a specific outlet
 * of a multi-channel device) via eWeLink's GET /v2/device/thing.
 */
async function getDeviceState(token: string, deviceId: string, outlet?: number): Promise<string> {
  const r = await fetch(`${API_BASE}/v2/device/thing?id=${deviceId}`, {
    headers: { "Authorization": `Bearer ${token}`, "X-CK-Appid": EWELINK_APPID },
  });
  const j = await r.json();
  if (j.error !== 0) throw new Error(j.msg || "Status failed");

  const device = j.data?.thingList?.find((item: any) => item.itemData?.deviceid === deviceId);
  if (!device) throw new Error("Device not found");

  const params = device.itemData?.params;
  if (params?.switches) {
    if (outlet !== undefined) {
      const sw = params.switches.find((s: any) => s.outlet === outlet);
      return sw?.switch || "unknown";
    }
    return params.switches.every((s: any) => s.switch === "on") ? "on" : "off";
  }
  return params?.switch || "unknown";
}

/**
 * Load the cached eWeLink access_token from app_tokens, refreshing it first
 * if it's within 5 minutes of expiry (or already expired).
 */
async function getToken(): Promise<string> {
  const { data } = await db
    .from("app_tokens")
    .select("access_token,refresh_token,expires_at")
    .eq("service", "ewelink")
    .single();

  if (!data) throw new Error("Token missing");

  if (data.expires_at && new Date(data.expires_at).getTime() > Date.now() + 300_000) {
    return data.access_token;
  }

  const r = await fetch(`${API_BASE}/v2/user/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${data.access_token}`,
      "X-CK-Appid": EWELINK_APPID,
    },
    body: JSON.stringify({ rt: data.refresh_token }),
  });
  const j = await r.json();
  if (j.error !== 0 || !j.data?.at) throw new Error("Refresh failed");

  await db.from("app_tokens").upsert(
    {
      service: "ewelink",
      access_token: j.data.at,
      refresh_token: j.data.rt || data.refresh_token,
      expires_at: new Date(Date.now() + 2_505_600_000).toISOString(), // ~29 days
      updated_at: new Date().toISOString(),
    },
    { onConflict: "service" },
  );

  return j.data.at;
}

async function ewelinkControl(deviceId: string, state: "on" | "off" | "status", outlet?: number): Promise<string> {
  const token = await getToken();

  if (state === "status") return await getDeviceState(token, deviceId, outlet);

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "X-CK-Appid": EWELINK_APPID,
  };
  const params = outlet === undefined ? { switch: state } : { switches: [{ outlet, switch: state }] };

  const response = await fetch(`${API_BASE}/v2/device/thing/status`, {
    method: "POST",
    headers,
    body: JSON.stringify({ type: 1, id: deviceId, params }),
  });
  const j = await response.json();
  if (j.error !== 0) throw new Error(j.msg || "Control failed");
  return state;
}

async function cubeControl(deviceId: string, state: "on" | "off" | "status", outlet?: number): Promise<string> {
  if (state === "status") return await cubeGetPower(db, deviceId, outlet);
  return await cubeSetPower(db, deviceId, state, outlet);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { code, deviceId, state, outlet } = await req.json();

    if (!code || !/^[a-fA-F0-9]{8,64}$/.test(deviceId || "") || !["on", "off", "status"].includes(state)) {
      return out({ success: false, error: "Neteisingi valdymo duomenys" }, 400);
    }
    if (outlet !== undefined && (!Number.isInteger(outlet) || outlet < 0 || outlet > 32)) {
      return out({ success: false, error: "Neteisingas kanalo numeris" }, 400);
    }

    const { data: g } = await db
      .from("gate_codes")
      .select("unlimited,valid_from,valid_to")
      .eq("code", code)
      .single();

    if (!g) return out({ success: false, error: "Neteisingas kodas" }, 404);
    if (!g.unlimited && (new Date() < new Date(g.valid_from) || new Date() > new Date(g.valid_to))) {
      return out({ success: false, error: "Kodas negalioja" }, 403);
    }

    const { value, via } = await routed(
      db,
      () => ewelinkControl(deviceId, state, outlet),
      () => cubeControl(deviceId, state, outlet),
    );

    return out({ success: true, state: value, via });
  } catch (e) {
    console.error(e);
    return out({ success: false, error: "Nepavyko valdyti irenginio" }, 500);
  }
});
