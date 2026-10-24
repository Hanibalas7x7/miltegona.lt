// eWeLink CUBE client for edge functions. Reaches the CUBE through the Cloudflare tunnel
// (cube.miltegona.lt, protected by an Access service token) and renews its own API token.

const CUBE_URL = (Deno.env.get("CUBE_URL") || "https://cube.miltegona.lt").replace(/\/+$/, "");
const CF_ACCESS_CLIENT_ID = Deno.env.get("CF_ACCESS_CLIENT_ID") || "";
const CF_ACCESS_CLIENT_SECRET = Deno.env.get("CF_ACCESS_CLIENT_SECRET") || "";
const CUBE_PASSWORD = Deno.env.get("CUBE_PASSWORD") || "";

const REQUEST_TIMEOUT_MS = 6000;
const COMMAND_TIMEOUT_MS = 10000;
const NONCE_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Json = any;

export function cubeConfigured(): boolean {
  return !!(CF_ACCESS_CLIENT_ID && CF_ACCESS_CLIENT_SECRET && CUBE_PASSWORD);
}

function nonce(): string {
  let out = "";
  for (let i = 0; i < 8; i++) out += NONCE_CHARS[Math.floor(Math.random() * NONCE_CHARS.length)];
  return out;
}

function accessHeaders(): Record<string, string> {
  return { "CF-Access-Client-Id": CF_ACCESS_CLIENT_ID, "CF-Access-Client-Secret": CF_ACCESS_CLIENT_SECRET };
}

async function raw(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<Json> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Nonce: nonce(),
    ...accessHeaders(),
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${CUBE_URL}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? REQUEST_TIMEOUT_MS),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`CUBE HTTP ${res.status}: ${text.slice(0, 80)}`);
  }
}

const TOKEN_PATH = "/open-api/v2/rest/bridge/access_token?app_name=miltegona_server";

// Same calls the CUBE web UI makes when the owner presses "Done".
async function renewToken(db: Db): Promise<string> {
  if (!CUBE_PASSWORD) throw new Error("CUBE_PASSWORD nenustatytas");

  const first = await raw("GET", TOKEN_PATH);
  let token: string | undefined = first.error === 0 ? first.data?.token : undefined;

  if (!token) {
    const login = await raw("POST", "/api/v1/rest/bridge/login", { body: { password: CUBE_PASSWORD } });
    const at = login.data?.at;
    if (login.error !== 0 || !at) throw new Error(`CUBE login klaida ${login.error}`);
    const auth = await raw("POST", "/api/v1/rest/bridge/openapi/authorization", {
      token: at,
      body: { type: "openapi" },
    });
    if (auth.error !== 0) throw new Error(`CUBE autorizacijos klaida ${auth.error}`);
    const second = await raw("GET", TOKEN_PATH);
    token = second.error === 0 ? second.data?.token : undefined;
    if (!token) throw new Error(`CUBE tokenas negautas: ${second.message ?? second.error}`);
  }

  await db.from("app_tokens").upsert({
    service: "cube",
    access_token: token,
    refresh_token: "",
    expires_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "service" });
  return token;
}

async function storedToken(db: Db): Promise<string | null> {
  const { data } = await db.from("app_tokens").select("access_token").eq("service", "cube").maybeSingle();
  return data?.access_token || null;
}

/** Authenticated CUBE Open API call; renews the token once if CUBE rejects it. */
export async function cubeApi(
  db: Db,
  method: string,
  path: string,
  body?: unknown,
  timeoutMs?: number,
): Promise<Json> {
  let token = await storedToken(db);
  if (!token) token = await renewToken(db);
  let result = await raw(method, `/open-api/v2/rest${path}`, { token, body, timeoutMs });
  if (result.error === 401) {
    token = await renewToken(db);
    result = await raw(method, `/open-api/v2/rest${path}`, { token, body, timeoutMs });
  }
  return result;
}

async function devices(db: Db): Promise<Json[]> {
  const result = await cubeApi(db, "GET", "/devices");
  if (result.error !== 0) throw new Error(`CUBE klaida ${result.error}: ${result.message}`);
  return result.data?.device_list ?? [];
}

// Built-in eWeLink devices carry "<eWeLink id>_built_in" as third_serial_number.
function findDevice(list: Json[], deviceId: string): Json | undefined {
  return list.find((d) =>
    d.third_serial_number === deviceId ||
    d.third_serial_number === `${deviceId}_built_in` ||
    d.serial_number === deviceId
  );
}

// eWeLink outlets are 0-based, CUBE toggle names start at "1".
const toggleName = (outlet: number) => String(outlet + 1);

function readPower(device: Json, outlet?: number): "on" | "off" | "unknown" {
  const state = device.state ?? {};
  const toggles = state.toggle;
  let power: string | undefined;
  if (outlet !== undefined && toggles) power = toggles[toggleName(outlet)]?.toggleState;
  else if (state.power) power = state.power.powerState;
  else if (toggles && Object.keys(toggles).length) {
    power = Object.values(toggles).every((c: Json) => c.toggleState === "on") ? "on" : "off";
  }
  return power === "on" || power === "off" ? power : "unknown";
}

function powerState(device: Json, outlet: number | undefined, value: "on" | "off"): Json {
  const state = device.state ?? {};
  if (outlet !== undefined && state.toggle) return { toggle: { [toggleName(outlet)]: { toggleState: value } } };
  if (state.power || !state.toggle) return { power: { powerState: value } };
  return { toggle: Object.fromEntries(Object.keys(state.toggle).map((k) => [k, { toggleState: value }])) };
}

async function requireDevice(db: Db, deviceId: string): Promise<Json> {
  const device = findDevice(await devices(db), deviceId);
  if (!device) throw new Error(`Irenginys ${deviceId} nerastas CUBE sarase`);
  if (device.online === false) throw new Error("Irenginys offline CUBE");
  return device;
}

export async function cubeGetPower(db: Db, deviceId: string, outlet?: number): Promise<"on" | "off" | "unknown"> {
  return readPower(await requireDevice(db, deviceId), outlet);
}

/** `toggle` flips the current state; returns the state that was sent. */
export async function cubeSetPower(
  db: Db,
  deviceId: string,
  state: "on" | "off" | "toggle",
  outlet?: number,
): Promise<"on" | "off"> {
  const device = await requireDevice(db, deviceId);
  const target = state === "toggle" ? (readPower(device, outlet) === "on" ? "off" : "on") : state;
  const result = await cubeApi(
    db,
    "PUT",
    `/devices/${device.serial_number}`,
    { state: powerState(device, outlet, target) },
    COMMAND_TIMEOUT_MS,
  );
  if (result.error !== 0) throw new Error(`CUBE valdymo klaida ${result.error}: ${result.message}`);
  return target;
}

/** Lightweight reachability + auth check used by the health job. */
export async function cubeProbe(db: Db): Promise<void> {
  await devices(db);
}

export async function cubeGetLight(
  db: Db,
  deviceId: string,
): Promise<{ state: "on" | "off" | "unknown"; brightness?: number }> {
  const device = await requireDevice(db, deviceId);
  const level = device.state?.brightness?.brightness;
  return { state: readPower(device), brightness: typeof level === "number" ? level : undefined };
}

/** Sets the level (1-100), switching the light on first only if it is off. */
export async function cubeSetBrightness(db: Db, deviceId: string, value: number): Promise<number> {
  const device = await requireDevice(db, deviceId);
  const next = Math.min(100, Math.max(1, Math.round(value)));
  // Re-sending power:on to a lit bulb makes it blink and ignore the level.
  const state = {
    ...(readPower(device) === "on" ? {} : powerState(device, undefined, "on")),
    brightness: { brightness: next },
  };
  const result = await cubeApi(db, "PUT", `/devices/${device.serial_number}`, { state }, COMMAND_TIMEOUT_MS);
  if (result.error !== 0) throw new Error(`CUBE valdymo klaida ${result.error}: ${result.message}`);
  return next;
}

/** Opens the CUBE server-sent event stream (device state pushes; heartbeat every ~20 s). */
export async function cubeOpenStream(db: Db, signal: AbortSignal): Promise<ReadableStream<Uint8Array>> {
  let token = (await storedToken(db)) ?? await renewToken(db);
  for (let attempt = 0;; attempt++) {
    const res = await fetch(`${CUBE_URL}/open-api/v2/sse/bridge?access_token=${encodeURIComponent(token)}`, {
      headers: accessHeaders(),
      signal,
    });
    if (res.ok && res.body && (res.headers.get("content-type") ?? "").includes("text/event-stream")) return res.body;
    const text = await res.text().catch(() => "");
    if (attempt === 0 && (res.status === 401 || /"error"\s*:\s*401/.test(text))) {
      token = await renewToken(db);
      continue;
    }
    throw new Error(`CUBE HTTP ${res.status}: ${text.slice(0, 80)}`);
  }
}
