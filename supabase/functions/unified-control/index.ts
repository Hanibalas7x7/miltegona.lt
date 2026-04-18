// Supabase Edge Function - Unified Gate & Light Control
// Deploy: supabase functions deploy unified-control
//
// Token lifecycle:
//   - eWeLink access tokens expire every ~30 days.
//   - Tokens are persisted in the `app_tokens` table (service = 'ewelink').
//   - Before every eWeLink call this function checks expiry and refreshes when needed.
//   - If refresh fails (both tokens expired), auto re-login by calling the
//     ewelink-login edge function with EWELINK_EMAIL + EWELINK_PASSWORD secrets.
//   - EWELINK_TOKEN / EWELINK_REFRESH_TOKEN secrets are used only to bootstrap the
//     first row in app_tokens (i.e. after a fresh re-authentication).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-password',
}

// ── Supabase ────────────────────────────────────────────────────────────────
const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── eWeLink constants ────────────────────────────────────────────────────────
const EWELINK_APPID      = Deno.env.get('EWELINK_APPID')       || 'P8OjRMaJNI9SMhkd6icQ4Z3331UsowRG'
const EWELINK_EMAIL      = Deno.env.get('EWELINK_EMAIL')       || ''
const EWELINK_PASSWORD   = Deno.env.get('EWELINK_PASSWORD')    || ''
const EWELINK_REGION     = Deno.env.get('EWELINK_REGION')      || 'eu'
const EWELINK_API_URL    = `https://${EWELINK_REGION}-apia.coolkit.cc`

// Device IDs
const LIGHT_DEVICE_ID        = Deno.env.get('LIGHT_DEVICE_ID')        || '1001e7d80b'
const BUILDING_GATE_DEVICE_ID = Deno.env.get('BUILDING_GATE_DEVICE_ID') || '10018ad15d'

// ── Token management ─────────────────────────────────────────────────────────

interface TokenRow {
  access_token:  string
  refresh_token: string
  expires_at:    string | null
}

/**
 * Load token from app_tokens table.
 * Falls back to EWELINK_TOKEN secret and creates a bootstrap row if no row exists.
 */
async function loadToken(): Promise<TokenRow> {
  const { data, error } = await supabase
    .from('app_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('service', 'ewelink')
    .single()

  if (error || !data) {
    // Bootstrap: persist the secrets as the initial row so we can refresh later
    const bootstrapAT = Deno.env.get('EWELINK_TOKEN') || ''
    const bootstrapRT = Deno.env.get('EWELINK_REFRESH_TOKEN') || ''

    if (!bootstrapAT) {
      throw new Error('No eWeLink token found in app_tokens or EWELINK_TOKEN secret')
    }

    console.log('🆕 Bootstrapping ewelink token row from secrets')

    const { error: insertError } = await supabase
      .from('app_tokens')
      .upsert({
        service:       'ewelink',
        access_token:  bootstrapAT,
        refresh_token: bootstrapRT,
        // Force immediate refresh on next use by setting expiry in the past
        expires_at:    new Date(Date.now() - 1000).toISOString(),
        updated_at:    new Date().toISOString(),
      }, { onConflict: 'service' })

    if (insertError) console.error('⚠️ Failed to upsert bootstrap token:', insertError)

    return { access_token: bootstrapAT, refresh_token: bootstrapRT, expires_at: null }
  }

  return data as TokenRow
}

/**
 * Persist refreshed tokens back to app_tokens.
 */
async function saveToken(at: string, rt: string, expiresAt: Date): Promise<void> {
  const { error } = await supabase
    .from('app_tokens')
    .upsert({
      service:       'ewelink',
      access_token:  at,
      refresh_token: rt,
      expires_at:    expiresAt.toISOString(),
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'service' })

  if (error) console.error('⚠️ Failed to save refreshed token:', error)
}

/**
 * Call eWeLink POST /v2/user/refresh.
 * eWeLink requires the (possibly expired) AT in Authorization even for refresh calls.
 */
async function refreshEweLinkToken(row: TokenRow): Promise<string> {
  console.log('🔄 Refreshing eWeLink access token...')

  const response = await fetch(`${EWELINK_API_URL}/v2/user/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${row.access_token}`,
      'X-CK-Appid':    EWELINK_APPID,
    },
    body: JSON.stringify({ rt: row.refresh_token }),
  })

  const data = await response.json()
  console.log('🔄 Refresh response:', JSON.stringify(data))

  if (data.error !== 0 || !data.data?.at) {
    throw new Error(`Token refresh failed: ${data.msg || JSON.stringify(data)}`)
  }

  const newAT = data.data.at as string
  const newRT = (data.data.rt as string | undefined) || row.refresh_token

  // eWeLink access tokens last 30 days; subtract 1h as safety margin
  const expiresAt = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000)
  await saveToken(newAT, newRT, expiresAt)

  console.log('✅ Token refreshed, new expiry:', expiresAt.toISOString())
  return newAT
}

/**
 * Full re-login by calling the ewelink-login edge function internally.
 * Used as fallback when the refresh token is also expired.
 * NOTE: Standard Role appid does not support direct login — this will fail.
 * The user must manually re-authenticate via /ewelink-auth.html (OAuth flow).
 */
async function reloginEweLink(): Promise<string> {
  throw new Error(
    'Visi eWeLink tokenai pasibaigę. Prašome prisijungti iš naujo: https://miltegona.lt/ewelink-auth.html'
  )
}

/**
 * Returns a valid (non-expired) eWeLink access token, refreshing if necessary.
 * Tokens within 5 minutes of expiry are pre-emptively refreshed.
 * Falls back to full re-login if refresh fails.
 */
async function getValidToken(): Promise<string> {
  const row = await loadToken()

  const isExpired = !row.expires_at ||
    new Date(row.expires_at).getTime() < Date.now() + 5 * 60 * 1000

  if (!isExpired) {
    return row.access_token
  }

  try {
    return await refreshEweLinkToken(row)
  } catch (refreshErr) {
    console.warn('⚠️ Token refresh failed, attempting full re-login:', refreshErr)
    return reloginEweLink()
  }
}

// ── eWeLink API helpers ───────────────────────────────────────────────────────

async function getEweLinkDeviceStatus(deviceId: string) {
  try {
    const token = await getValidToken()

    const response = await fetch(`${EWELINK_API_URL}/v2/device/thing?id=${deviceId}`, {
      method: 'GET',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CK-Appid':    EWELINK_APPID,
      },
    })

    const data = await response.json()
    console.log('📊 eWeLink status response for device:', deviceId, JSON.stringify(data))

    if (data.error === 0 && data.data?.thingList) {
      const device = data.data.thingList.find((item: any) =>
        item.itemData?.deviceid === deviceId
      )

      if (device) {
        const params = device.itemData?.params

        if (params?.switches) {
          const allOn = params.switches.every((sw: any) => sw.switch === 'on')
          const switchState = allOn ? 'on' : 'off'
          console.log('💡 Multi-channel state:', switchState)
          return { success: true, state: switchState }
        } else {
          const switchState = params?.switch || 'unknown'
          console.log('💡 Single-channel state:', switchState)
          return { success: true, state: switchState }
        }
      } else {
        console.log('⚠️ Device not found in thingList')
        return { success: false, error: 'Device not found' }
      }
    } else {
      throw new Error(data.msg || 'Unknown error')
    }
  } catch (error) {
    console.error('❌ eWeLink status error:', error)
    return { success: false, error: error.message }
  }
}

async function controlEweLinkDevice(deviceId: string, state: 'on' | 'off') {
  try {
    const token = await getValidToken()
    const isMultiChannel = deviceId === LIGHT_DEVICE_ID

    const params = isMultiChannel
      ? { switches: [{ outlet: 0, switch: state }, { outlet: 1, switch: state }] }
      : { switch: state }

    console.log('🎛️ Control params:', JSON.stringify(params))

    const response = await fetch(`${EWELINK_API_URL}/v2/device/thing/status`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CK-Appid':    EWELINK_APPID,
      },
      body: JSON.stringify({ type: 1, id: deviceId, params }),
    })

    const data = await response.json()

    if (data.error === 0) {
      return { success: true, message: `Device ${state}` }
    } else {
      throw new Error(data.msg || 'Unknown error')
    }
  } catch (error) {
    console.error('❌ eWeLink control error:', error)
    return { success: false, error: error.message }
  }
}

async function controlEweLinkGate(deviceId: string, outlet: number) {
  try {
    const token = await getValidToken()

    console.log(`🚪 Gate control - outlet: ${outlet}`)

    const response = await fetch(`${EWELINK_API_URL}/v2/device/thing/status`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CK-Appid':    EWELINK_APPID,
      },
      body: JSON.stringify({
        type: 1,
        id:   deviceId,
        params: { switches: [{ outlet, switch: 'on' }] },
      }),
    })

    const data = await response.json()

    if (data.error === 0) {
      return { success: true, message: `Gate outlet ${outlet} triggered` }
    } else {
      throw new Error(data.msg || 'Unknown error')
    }
  } catch (error) {
    console.error('❌ Gate control error:', error)
    return { success: false, error: error.message }
  }
}

async function openGate(deviceId?: string) {
  try {
    const targetDevice = deviceId || 'gate_opener_1'

    const response = await fetch(`${SUPABASE_URL}/rest/v1/gate_commands`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey':         SUPABASE_SERVICE_KEY,
        'Prefer':         'return=representation',
      },
      body: JSON.stringify({
        device_id:  targetDevice,
        command:    'open',
        created_at: new Date().toISOString(),
      }),
    })

    if (response.ok) {
      return { success: true, message: 'Gate open command sent' }
    } else {
      const errorText = await response.text()
      throw new Error(errorText)
    }
  } catch (error) {
    console.error('❌ Gate control error:', error)
    return { success: false, error: error.message }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('✅ Processing request')
    
    const { action, deviceId, state } = await req.json()
    
    console.log(`🎮 Action: ${action}`)

    let result

    switch (action) {
      case 'get_status':
        if (!deviceId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing deviceId' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
        result = await getEweLinkDeviceStatus(deviceId)
        break

      case 'open_territory_gate':
        result = await openGate(deviceId)
        break

      case 'open_building_gate':
        result = await controlEweLinkGate(BUILDING_GATE_DEVICE_ID, 0)
        break

      case 'close_building_gate':
        result = await controlEweLinkGate(BUILDING_GATE_DEVICE_ID, 1)
        break

      case 'light_on':
        result = await controlEweLinkDevice(LIGHT_DEVICE_ID, 'on')
        break

      case 'light_off':
        result = await controlEweLinkDevice(LIGHT_DEVICE_ID, 'off')
        break

      case 'device_control':
        if (!deviceId || !state) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing deviceId or state' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
        result = await controlEweLinkDevice(deviceId, state)
        break

      case 'open_territory_gate_and_light_on': {
        const gateResult = await openGate(deviceId)
        const lightResult = await controlEweLinkDevice(LIGHT_DEVICE_ID, 'on')
        result = {
          success: gateResult.success && lightResult.success,
          territoryGate: gateResult,
          light: lightResult,
        }
        break
      }

      case 'open_building_gate_and_light_on': {
        const buildingGateResult = await controlEweLinkGate(BUILDING_GATE_DEVICE_ID, 0)
        const buildingLightResult = await controlEweLinkDevice(LIGHT_DEVICE_ID, 'on')
        result = {
          success: buildingGateResult.success && buildingLightResult.success,
          buildingGate: buildingGateResult,
          light: buildingLightResult,
        }
        break
      }

      case 'token_info': {
        const { data: tokenData } = await supabase
          .from('app_tokens')
          .select('expires_at')
          .eq('service', 'ewelink')
          .single()
        result = { success: true, expires_at: tokenData?.expires_at || null }
        break
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Unknown action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
