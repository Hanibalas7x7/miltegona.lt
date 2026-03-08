// Supabase Edge Function - eWeLink Direct Login
// Deploy: supabase functions deploy ewelink-login --no-verify-jwt
//
// Uses /v2/user/login directly (server-side) to get AT+RT.
// APP_SECRET never leaves the server. No OAuth web redirect needed.
//
// Required Supabase secret:
//   supabase secrets set EWELINK_APP_SECRET=<your_app_secret>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const APPID        = Deno.env.get("EWELINK_APPID")       || "P8OjRMaJNI9SMhkd6icQ4Z3331UsowRG";
const APP_SECRET   = Deno.env.get("EWELINK_APP_SECRET")!;
const REGION       = Deno.env.get("EWELINK_REGION")      || "eu";
const API_BASE     = `https://${REGION}-apia.coolkit.cc`;

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── Crypto ────────────────────────────────────────────────────────────────────

function randomNonce(len = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => chars[b % chars.length]).join("");
}

async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// Pure-JS MD5 (crypto.subtle does not support MD5 in WebCrypto)
function md5Hex(text: string): string {
  function safeAdd(x: number, y: number) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xffff);
  }
  function bitRotateLeft(num: number, cnt: number) { return (num << cnt) | (num >>> (32 - cnt)); }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function md5ff(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return md5cmn((b&c)|((~b)&d),a,b,x,s,t);}
  function md5gg(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return md5cmn((b&d)|(c&(~d)),a,b,x,s,t);}
  function md5hh(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return md5cmn(b^c^d,a,b,x,s,t);}
  function md5ii(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return md5cmn(c^(b|(~d)),a,b,x,s,t);}

  function bytesToWords(bytes: number[]) {
    const words: number[] = [];
    for (let i = 0; i < bytes.length * 8; i += 8)
      words[i >> 5] |= (bytes[i / 8] & 0xff) << (i % 32);
    return words;
  }

  // UTF-8 encode
  const enc = new TextEncoder();
  const bytes = Array.from(enc.encode(text));
  const m = bytesToWords(bytes);
  const l = bytes.length * 8;
  m[l >> 5] |= 0x80 << (l % 32);
  m[(((l + 64) >>> 9) << 4) + 14] = l;

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < m.length; i += 16) {
    const [aa, bb, cc, dd] = [a, b, c, d];
    a=md5ff(a,b,c,d,m[i],7,-680876936);      d=md5ff(d,a,b,c,m[i+1],12,-389564586);
    c=md5ff(c,d,a,b,m[i+2],17,606105819);    b=md5ff(b,c,d,a,m[i+3],22,-1044525330);
    a=md5ff(a,b,c,d,m[i+4],7,-176418897);    d=md5ff(d,a,b,c,m[i+5],12,1200080426);
    c=md5ff(c,d,a,b,m[i+6],17,-1473231341);  b=md5ff(b,c,d,a,m[i+7],22,-45705983);
    a=md5ff(a,b,c,d,m[i+8],7,1770035416);    d=md5ff(d,a,b,c,m[i+9],12,-1958414417);
    c=md5ff(c,d,a,b,m[i+10],17,-42063);      b=md5ff(b,c,d,a,m[i+11],22,-1990404162);
    a=md5ff(a,b,c,d,m[i+12],7,1804603682);   d=md5ff(d,a,b,c,m[i+13],12,-40341101);
    c=md5ff(c,d,a,b,m[i+14],17,-1502002290); b=md5ff(b,c,d,a,m[i+15],22,1236535329);
    a=md5gg(a,b,c,d,m[i+1],5,-165796510);    d=md5gg(d,a,b,c,m[i+6],9,-1069501632);
    c=md5gg(c,d,a,b,m[i+11],14,643717713);   b=md5gg(b,c,d,a,m[i],20,-373897302);
    a=md5gg(a,b,c,d,m[i+5],5,-701558691);    d=md5gg(d,a,b,c,m[i+10],9,38016083);
    c=md5gg(c,d,a,b,m[i+15],14,-660478335);  b=md5gg(b,c,d,a,m[i+4],20,-405537848);
    a=md5gg(a,b,c,d,m[i+9],5,568446438);     d=md5gg(d,a,b,c,m[i+14],9,-1019803690);
    c=md5gg(c,d,a,b,m[i+3],14,-187363961);   b=md5gg(b,c,d,a,m[i+8],20,1163531501);
    a=md5gg(a,b,c,d,m[i+13],5,-1444681467);  d=md5gg(d,a,b,c,m[i+2],9,-51403784);
    c=md5gg(c,d,a,b,m[i+7],14,1735328473);   b=md5gg(b,c,d,a,m[i+12],20,-1926607734);
    a=md5hh(a,b,c,d,m[i+5],4,-378558);       d=md5hh(d,a,b,c,m[i+8],11,-2022574463);
    c=md5hh(c,d,a,b,m[i+11],16,1839030562);  b=md5hh(b,c,d,a,m[i+14],23,-35309556);
    a=md5hh(a,b,c,d,m[i+1],4,-1530992060);   d=md5hh(d,a,b,c,m[i+4],11,1272893353);
    c=md5hh(c,d,a,b,m[i+7],16,-155497632);   b=md5hh(b,c,d,a,m[i+10],23,-1094730640);
    a=md5hh(a,b,c,d,m[i+13],4,681279174);    d=md5hh(d,a,b,c,m[i],11,-358537222);
    c=md5hh(c,d,a,b,m[i+3],16,-722521979);   b=md5hh(b,c,d,a,m[i+6],23,76029189);
    a=md5hh(a,b,c,d,m[i+9],4,-640364487);    d=md5hh(d,a,b,c,m[i+12],11,-421815835);
    c=md5hh(c,d,a,b,m[i+15],16,530742520);   b=md5hh(b,c,d,a,m[i+2],23,-995338651);
    a=md5ii(a,b,c,d,m[i],6,-198630844);       d=md5ii(d,a,b,c,m[i+7],10,1126891415);
    c=md5ii(c,d,a,b,m[i+14],15,-1416354905); b=md5ii(b,c,d,a,m[i+5],21,-57434055);
    a=md5ii(a,b,c,d,m[i+12],6,1700485571);   d=md5ii(d,a,b,c,m[i+3],10,-1894986606);
    c=md5ii(c,d,a,b,m[i+10],15,-1051523);    b=md5ii(b,c,d,a,m[i+1],21,-2054922799);
    a=md5ii(a,b,c,d,m[i+8],6,1873313359);    d=md5ii(d,a,b,c,m[i+15],10,-30611744);
    c=md5ii(c,d,a,b,m[i+6],15,-1560198380);  b=md5ii(b,c,d,a,m[i+13],21,1309151649);
    a=md5ii(a,b,c,d,m[i+4],6,-145523070);    d=md5ii(d,a,b,c,m[i+11],10,-1120210379);
    c=md5ii(c,d,a,b,m[i+2],15,718787259);    b=md5ii(b,c,d,a,m[i+9],21,-343485551);
    a=safeAdd(a,aa); b=safeAdd(b,bb); c=safeAdd(c,cc); d=safeAdd(d,dd);
  }

  const result = [a, b, c, d];
  const hexChars: string[] = [];
  for (let i = 0; i < result.length * 32; i += 8) {
    hexChars.push(((result[i >> 5] >>> (i % 32)) & 0xff).toString(16).padStart(2, "0"));
  }
  return hexChars.join("");
}

function buildSignHeaders(nonce: string, seq: string, sign: string) {
  return {
    "Content-Type":  "application/json; charset=utf-8",
    "X-CK-Appid":    APPID,
    "X-CK-Nonce":    nonce,
    "X-CK-Seq":      seq,
    "Authorization": `Sign ${sign}`,
  };
}

// ── Token persistence ─────────────────────────────────────────────────────────

async function saveToken(at: string, rt: string): Promise<void> {
  const supabase  = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const expiresAt = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("app_tokens")
    .upsert({
      service:       "ewelink",
      access_token:  at,
      refresh_token: rt,
      expires_at:    expiresAt,
      updated_at:    new Date().toISOString(),
    }, { onConflict: "service" });

  if (error) console.error("⚠️ Failed to save token:", error);
  else console.log("✅ Tokens saved, expires:", expiresAt);
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!APP_SECRET) throw new Error("EWELINK_APP_SECRET secret is not set");

    const { email, password, countryCode } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, error: "Missing email or password" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seq   = Date.now().toString();
    const nonce = randomNonce();

    // eWeLink API requires password as MD5 hash
    const passwordHash = md5Hex(password);

    // Email login must NOT include countryCode (that's only for phone login)
    const body: Record<string, string> = {
      email,
      password: passwordHash,
    };

    const bodyStr = JSON.stringify(body);

    // For /v2/user/login the signature message is the raw JSON body string
    const sign = await hmacSha256Base64(APP_SECRET, bodyStr);

    console.log(`🔑 Attempting eWeLink login for: ${email} via ${API_BASE}`);
    console.log(`📦 Body: ${bodyStr}`);
    console.log(`✍️ Sign: ${sign}`);

    const response = await fetch(`${API_BASE}/v2/user/login`, {
      method: "POST",
      headers: buildSignHeaders(nonce, seq, sign),
      body: bodyStr,
    });

    const data = await response.json();
    console.log("eWeLink login full response:", JSON.stringify(data));

    // Error 10004 = wrong region — retry with the correct region from the response
    if (data.error === 10004 && data.data?.region) {
      const correctRegion = data.data.region;
      console.log(`🌍 Wrong region, retrying with: ${correctRegion}`);

      const seq2   = Date.now().toString();
      const nonce2 = randomNonce();
      const sign2  = await hmacSha256Base64(APP_SECRET, bodyStr);

      const retryUrl = `https://${correctRegion}-apia.coolkit.cc/v2/user/login`;
      const retryResp = await fetch(retryUrl, {
        method: "POST",
        headers: buildSignHeaders(nonce2, seq2, sign2),
        body: bodyStr,
      });

      const retryData = await retryResp.json();
      console.log("Retry login response error code:", retryData.error);

      if (retryData.error !== 0 || !retryData.data?.at) {
        return new Response(
          JSON.stringify({ success: false, error: retryData.msg || `eWeLink error ${retryData.error}`, raw: retryData }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const at = retryData.data.at as string;
      const rt = retryData.data.rt as string;
      await saveToken(at, rt);

      return new Response(
        JSON.stringify({
          success:       true,
          access_token:  at,
          refresh_token: rt,
          expires_at:    new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
          region:        correctRegion,
          message:       "Prisijungta sėkmingai. Tokenai išsaugoti į app_tokens lentelę.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (data.error !== 0 || !data.data?.at) {
      const errMsg =
        data.error === 400   ? `Parametrų klaida: ${data.msg}` :
        data.error === 401   ? "Neteisingas el. paštas arba slaptažodis." :
        data.error === 301   ? "Paskyra nerasta. Patikrink el. paštą." :
        data.error === 10003 ? "Neteisingi prisijungimo duomenys." :
        data.msg || `eWeLink klaida: ${data.error}`;

      return new Response(
        JSON.stringify({ success: false, error: errMsg, raw: data }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const at = data.data.at as string;
    const rt = data.data.rt as string;
    await saveToken(at, rt);

    return new Response(
      JSON.stringify({
        success:       true,
        access_token:  at,
        refresh_token: rt,
        expires_at:    new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
        region:        REGION,
        message:       "Prisijungta sėkmingai. Tokenai išsaugoti į app_tokens lentelę.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Login error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
