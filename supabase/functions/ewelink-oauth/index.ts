// Supabase Edge Function - eWeLink OAuth Token Exchange
// Deploy: supabase functions deploy ewelink-oauth --no-verify-jwt
//
// Handles the OAuth2.0 code → token exchange server-side so that:
//   1. APP_SECRET never leaves the server
//   2. CORS is not an issue (eWeLink blocks browser-direct requests)
//
// Required Supabase secret:
//   supabase secrets set EWELINK_APP_SECRET=<your_app_secret>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const APPID      = Deno.env.get("EWELINK_APPID")   || "P8OjRMaJNI9SMhkd6icQ4Z3331UsowRG";
const APP_SECRET = Deno.env.get("EWELINK_APP_SECRET")!;
const REGION     = Deno.env.get("EWELINK_REGION")  || "eu";
const API_BASE   = `https://${REGION}-apia.coolkit.cc`;
const REDIRECT_URL = "https://xyzttzqvbescdpihvyfu.supabase.co/functions/v1/ewelink-oauth";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── Crypto helpers ────────────────────────────────────────────────────────────

function randomNonce(len = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const array = new Uint8Array(len);
  crypto.getRandomValues(array);
  for (const byte of array) result += chars[byte % chars.length];
  return result;
}

async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const enc     = new TextEncoder();
  const key     = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig     = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
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
  else console.log("✅ Tokens saved to app_tokens, expires:", expiresAt);
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // GET /ewelink-oauth?action=get-url → returns a fully-signed OAuth popup URL
  // GET /ewelink-oauth?code=XXX       → OAuth redirect callback: exchange code, redirect to ewelink-auth.html
  if (req.method === "GET") {
    try {
      if (!APP_SECRET) {
        throw new Error("EWELINK_APP_SECRET secret is not set in Supabase");
      }

      const url  = new URL(req.url);
      const code = url.searchParams.get("code");

      // ── OAuth redirect callback ──────────────────────────────────────────
      if (code) {
        const seq   = Date.now().toString();
        const nonce = randomNonce();
        const bodyObj  = { code, redirectUrl: REDIRECT_URL, grantType: "authorization_code" };
        const bodyJson = JSON.stringify(bodyObj);
        const sign     = await hmacSha256Base64(APP_SECRET, bodyJson);

        const response = await fetch(`${API_BASE}/v2/user/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type":  "application/json; charset=utf-8",
            "X-CK-Appid":    APPID,
            "X-CK-Nonce":    nonce,
            "X-CK-Seq":      seq,
            "Authorization": `Sign ${sign}`,
          },
          body: bodyJson,
        });
        const data = await response.json();

        if (data.error !== 0 || !data.data?.accessToken) {
          const errMsg = encodeURIComponent(data.msg || `eWeLink error ${data.error}`);
          return Response.redirect(`https://miltegona.lt/ewelink-auth.html?error=${errMsg}`, 302);
        }

        const at = data.data.accessToken as string;
        const rt = data.data.refreshToken as string;
        await saveToken(at, rt);

        return Response.redirect("https://miltegona.lt/ewelink-auth.html?success=1", 302);
      }

      const seq   = Date.now().toString();
      const nonce = randomNonce();
      const state = randomNonce(16);

      // OAuth popup signature: HMAC-SHA256(clientSecret, clientId + "_" + seq)
      const sign = await hmacSha256Base64(APP_SECRET, `${APPID}_${seq}`);

      const params = new URLSearchParams({
        clientId:      APPID,
        seq,
        authorization: sign,
        redirectUrl:   REDIRECT_URL,
        nonce,
        grantType:     "authorization_code",
        state,
        region:        REGION,
      });

      const oauthUrl = `https://c2ccdn.coolkit.cc/oauth/index.html?${params.toString()}`;
      console.log(`🔗 Generated OAuth URL (seq=${seq})`);

      return new Response(
        JSON.stringify({ success: true, url: oauthUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!APP_SECRET) {
      throw new Error("EWELINK_APP_SECRET secret is not set in Supabase");
    }

    const { code } = await req.json();

    if (!code) {
      return new Response(JSON.stringify({ success: false, error: "Missing code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build signed request
    const seq   = Date.now().toString();
    const nonce = randomNonce();

    // POST /v2/user/oauth/token: sign the request body JSON string (not APPID_nonce_seq)
    const bodyObj  = { code, redirectUrl: REDIRECT_URL, grantType: "authorization_code" };
    const bodyJson = JSON.stringify(bodyObj);
    const sign     = await hmacSha256Base64(APP_SECRET, bodyJson);

    console.log(`🔑 Exchanging code for tokens (seq=${seq}, nonce=${nonce})`);

    const response = await fetch(`${API_BASE}/v2/user/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json; charset=utf-8",
        "X-CK-Appid":    APPID,
        "X-CK-Nonce":    nonce,
        "X-CK-Seq":      seq,
        "Authorization": `Sign ${sign}`,
      },
      body: bodyJson,
    });

    const data = await response.json();
    console.log("eWeLink token response error code:", data.error);

    if (data.error !== 0 || !data.data?.accessToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error:   data.msg || `eWeLink error ${data.error}`,
          raw:     data,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // POST /v2/user/oauth/token returns accessToken/refreshToken (token-refresh returns at/rt)
    const at = data.data.accessToken as string;
    const rt = data.data.refreshToken as string;

    // Persist immediately so the gate/light functions work right away
    await saveToken(at, rt);

    return new Response(
      JSON.stringify({
        success:       true,
        access_token:  at,
        refresh_token: rt,
        expires_at:    new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
        message:       "Tokenai sėkmingai gauti ir išsaugoti į app_tokens lentelę.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("❌ OAuth exchange error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
