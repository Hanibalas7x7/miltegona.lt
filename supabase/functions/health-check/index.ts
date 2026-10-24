// Probes the eWeLink cloud and the CUBE (through the tunnel) and stores the result in
// `service_health`. Called every 5 min from the server's cron with the service role key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { cubeConfigured, cubeProbe } from "../_shared/cube.ts";
import { recordHealth } from "../_shared/health.ts";

const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
const appId = Deno.env.get("EWELINK_APPID") || "P8OjRMaJNI9SMhkd6icQ4Z3331UsowRG";
const apiUrl = `https://${Deno.env.get("EWELINK_REGION") || "eu"}-apia.coolkit.cc`;

async function ewelinkAccessToken(): Promise<string> {
  const { data } = await db.from("app_tokens").select("access_token, refresh_token, expires_at, updated_at")
    .eq("service", "ewelink").maybeSingle();
  if (!data) throw new Error("Nerastas eWeLink tokenas");
  // Refreshing well before expiry keeps the token alive; eWeLink rejects a refresh once the access token has lapsed.
  if (data.expires_at && new Date(data.expires_at).getTime() > Date.now() + 7 * 24 * 3600 * 1000) {
    return data.access_token;
  }
  // eWeLink rate-limits the app id, so a refresh it already rejected is not retried until the token row changes.
  const { data: last } = await db.from("service_health").select("ok, detail, checked_at")
    .eq("service", "ewelink").maybeSingle();
  if (last && !last.ok && last.detail.startsWith("Refresh failed") && !/too much/i.test(last.detail) &&
      new Date(data.updated_at) <= new Date(last.checked_at)) {
    throw new Error(last.detail);
  }

  const res = await fetch(`${apiUrl}/v2/user/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.access_token}`,
      "X-CK-Appid": appId,
    },
    body: JSON.stringify({ rt: data.refresh_token }),
    signal: AbortSignal.timeout(10000),
  });
  const result = await res.json();
  if (result.error !== 0 || !result.data?.at) throw new Error(`Refresh failed: ${result.msg ?? result.error}`);
  await db.from("app_tokens").upsert({
    service: "ewelink",
    access_token: result.data.at,
    refresh_token: result.data.rt || data.refresh_token,
    expires_at: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "service" });
  return result.data.at;
}

async function probeEwelink(): Promise<void> {
  const token = await ewelinkAccessToken();
  const res = await fetch(`${apiUrl}/v2/family`, {
    headers: { Authorization: `Bearer ${token}`, "X-CK-Appid": appId },
    signal: AbortSignal.timeout(10000),
  });
  const result = await res.json();
  if (result.error !== 0) throw new Error(`eWeLink klaida ${result.error}: ${result.msg}`);
}

async function check(service: "ewelink" | "cube", probe: () => Promise<void>) {
  try {
    await probe();
    await recordHealth(db, service, true);
    return { ok: true };
  } catch (error) {
    const detail = String((error as Error).message ?? error);
    await recordHealth(db, service, false, detail);
    return { ok: false, detail };
  }
}

// eWeLink rate-limits the app id, so its cloud is probed rarely; the CUBE is cheap and probed on every run.
const EWELINK_PROBE_INTERVAL_MS = 30 * 60 * 1000;

async function ewelinkProbeDue(): Promise<boolean> {
  const { data: last } = await db.from("service_health").select("checked_at").eq("service", "ewelink").maybeSingle();
  if (!last) return true;
  if (Date.now() - new Date(last.checked_at).getTime() >= EWELINK_PROBE_INTERVAL_MS) return true;
  // A re-authentication should show up right away.
  const { data: token } = await db.from("app_tokens").select("updated_at").eq("service", "ewelink").maybeSingle();
  return !!token && new Date(token.updated_at) > new Date(last.checked_at);
}

Deno.serve(async (req) => {
  if (req.headers.get("authorization") !== `Bearer ${serviceRoleKey}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const [ewelink, cube] = await Promise.all([
    (await ewelinkProbeDue()) ? check("ewelink", probeEwelink) : Promise.resolve({ skipped: true }),
    cubeConfigured() ? check("cube", () => cubeProbe(db)) : Promise.resolve({ ok: false, detail: "nesukonfiguruota" }),
  ]);
  return Response.json({ ewelink, cube });
});
