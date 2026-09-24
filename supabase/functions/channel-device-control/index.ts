import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);
const appId = Deno.env.get("EWELINK_APPID") || "P8OjRMaJNI9SMhkd6icQ4Z3331UsowRG";
const apiUrl = `https://${Deno.env.get("EWELINK_REGION") || "eu"}-apia.coolkit.cc`;

type TokenRow = {
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
};

function response(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getValidToken(): Promise<string> {
  const { data } = await supabase
    .from("app_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("service", "ewelink")
    .single();
  const token = data as TokenRow | null;
  if (!token) throw new Error("Nerastas eWeLink tokenas");

  if (token.expires_at && new Date(token.expires_at).getTime() > Date.now() + 300000) {
    return token.access_token;
  }

  const refresh = await fetch(`${apiUrl}/v2/user/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token.access_token}`,
      "X-CK-Appid": appId,
    },
    body: JSON.stringify({ rt: token.refresh_token }),
  });
  const result = await refresh.json();
  if (result.error !== 0 || !result.data?.at) {
    throw new Error(result.msg || "Nepavyko atnaujinti eWeLink tokeno");
  }

  await supabase.from("app_tokens").upsert({
    service: "ewelink",
    access_token: result.data.at,
    refresh_token: result.data.rt || token.refresh_token,
    expires_at: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "service" });
  return result.data.at;
}

async function controlDevice(deviceId: string, state: "on" | "off" | "toggle", outlet?: number) {
  const token = await getValidToken();
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "X-CK-Appid": appId,
  };
  const lookup = await fetch(`${apiUrl}/v2/device/thing?id=${deviceId}`, { headers });
  const lookupResult = await lookup.json();
  const device = lookupResult.data?.thingList?.find(
    (item: any) => item.itemData?.deviceid === deviceId,
  );
  if (lookupResult.error !== 0 || !device) {
    throw new Error(lookupResult.msg || "Irenginys nerastas eWeLink paskyroje");
  }

  const switches = device.itemData?.params?.switches;
  const targetState = state === "toggle"
    ? Array.isArray(switches)
      ? outlet === undefined
        ? switches.every((item: any) => item.switch === "on") ? "off" : "on"
        : switches.find((item: any) => item.outlet === outlet)?.switch === "on" ? "off" : "on"
      : device.itemData?.params?.switch === "on" ? "off" : "on"
    : state;
  const params = Array.isArray(switches)
    ? {
        switches: outlet === undefined
          ? switches.map((item: any) => ({ outlet: item.outlet, switch: targetState }))
          : [{ outlet, switch: targetState }],
      }
    : { switch: targetState };

  const command = await fetch(`${apiUrl}/v2/device/thing/status`, {
    method: "POST",
    headers,
    body: JSON.stringify({ type: 1, id: deviceId, params }),
  });
  const commandResult = await command.json();
  if (commandResult.error !== 0) {
    throw new Error(commandResult.msg || "Valdymas nepavyko");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ success: false, error: "Method not allowed" }, 405);

  try {
    const { code, deviceId, state, outlet } = await req.json();
    if (!code || !/^[a-fA-F0-9]{8,64}$/.test(deviceId || "") || !["on", "off", "toggle"].includes(state)) {
      return response({ success: false, error: "Neteisingi valdymo duomenys" }, 400);
    }
    if (outlet !== undefined && (!Number.isInteger(outlet) || outlet < 0 || outlet > 32)) {
      return response({ success: false, error: "Neteisingas kanalo numeris" }, 400);
    }

    const { data: gateCode } = await supabase
      .from("gate_codes")
      .select("unlimited, valid_from, valid_to")
      .eq("code", code)
      .single();
    if (!gateCode) return response({ success: false, error: "Neteisingas kodas" }, 404);
    if (!gateCode.unlimited &&
        (new Date() < new Date(gateCode.valid_from) || new Date() > new Date(gateCode.valid_to))) {
      return response({ success: false, error: "Kodas negalioja" }, 403);
    }

    await controlDevice(deviceId, state, outlet);
    return response({ success: true });
  } catch (error) {
    console.error(error);
    return response({ success: false, error: "Nepavyko valdyti irenginio" }, 500);
  }
});