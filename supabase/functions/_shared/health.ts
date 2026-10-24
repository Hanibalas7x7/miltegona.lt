// Shared "which backend should serve this request" logic. The health-check function keeps
// `service_health` current; control functions read it so a known-down eWeLink cloud is skipped.

import { cubeConfigured } from "./cube.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

// Older than this and the row says nothing about the present (eWeLink is probed every 30 min).
const HEALTH_MAX_AGE_MS = 90 * 60 * 1000;

export async function recordHealth(db: Db, service: "ewelink" | "cube", ok: boolean, detail = ""): Promise<void> {
  const { error } = await db.from("service_health").upsert({
    service,
    ok,
    detail: detail.slice(0, 300),
    checked_at: new Date().toISOString(),
  }, { onConflict: "service" });
  if (error) console.error("service_health upsert failed:", error.message);
}

async function eweLinkKnownDown(db: Db): Promise<boolean> {
  const { data } = await db.from("service_health").select("ok, checked_at").eq("service", "ewelink").maybeSingle();
  if (!data || data.ok) return false;
  return Date.now() - new Date(data.checked_at).getTime() < HEALTH_MAX_AGE_MS;
}

type HealthRow = { ok: boolean; detail: string; checked_at: string } | null;

/** What the status badge on the control page shows: both backends' health and the one used first. */
export async function backendStatus(db: Db): Promise<{
  active: "ewelink" | "cube" | "none";
  ewelink: HealthRow;
  cube: HealthRow;
}> {
  const { data } = await db.from("service_health").select("service, ok, detail, checked_at");
  const row = (service: string): HealthRow => (data ?? []).find((r: { service: string }) => r.service === service) ?? null;
  const ewelink = row("ewelink");
  const cube = row("cube");
  const ewelinkDown = !!ewelink && !ewelink.ok && Date.now() - new Date(ewelink.checked_at).getTime() < HEALTH_MAX_AGE_MS;
  const cubeDown = !!cube && !cube.ok;
  let active: "ewelink" | "cube" | "none" = "ewelink";
  if (cubeConfigured() && ewelinkDown) active = cubeDown ? "none" : "cube";
  return { active, ewelink, cube };
}

/** Runs the eWeLink cloud path or the CUBE path, whichever is expected to work, falling back to the other. */
export async function routed<T>(
  db: Db,
  ewelink: () => Promise<T>,
  cube: () => Promise<T>,
): Promise<{ value: T; via: "ewelink" | "cube" }> {
  if (!cubeConfigured()) return { value: await ewelink(), via: "ewelink" };

  const order: ("ewelink" | "cube")[] = (await eweLinkKnownDown(db)) ? ["cube", "ewelink"] : ["ewelink", "cube"];
  let lastError: unknown;
  for (const via of order) {
    try {
      const value = await (via === "cube" ? cube() : ewelink());
      if (via === "ewelink") await recordHealth(db, "ewelink", true);
      return { value, via };
    } catch (error) {
      lastError = error;
      console.error(`${via} failed:`, error);
    }
  }
  throw lastError;
}
