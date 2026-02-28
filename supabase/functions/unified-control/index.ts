// Supabase Edge Function - Unified Gate & Light Control
// Deploy: supabase functions deploy unified-control

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// eWeLink Configuration (from Supabase secrets only - more secure)
const EWELINK_TOKEN = Deno.env.get('EWELINK_TOKEN')!
const EWELINK_APPID = Deno.env.get('EWELINK_APPID')!
const EWELINK_REGION = Deno.env.get('EWELINK_REGION') || 'eu'
const EWELINK_API_URL = `https://${EWELINK_REGION}-apia.coolkit.cc`

// Device IDs (set as Supabase secrets or hardcode)
const LIGHT_DEVICE_ID = Deno.env.get('LIGHT_DEVICE_ID') || '1001e7d80b'
const BUILDING_GATE_DEVICE_ID = Deno.env.get('BUILDING_GATE_DEVICE_ID') || '10018ad15d'

// Supabase configuration for gate control
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function getEweLinkDeviceStatus(deviceId: string) {
  try {
    const response = await fetch(`${EWELINK_API_URL}/v2/device/thing?id=${deviceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EWELINK_TOKEN}`,
        'X-CK-Appid': EWELINK_APPID,
      },
    })

    const data = await response.json()
    console.log('📊 eWeLink API response for device:', deviceId)
    
    if (data.error === 0 && data.data?.thingList) {
      const device = data.data.thingList.find((item: any) => 
        item.itemData?.deviceid === deviceId
      )
      
      if (device) {
        const params = device.itemData?.params
        
        if (params?.switches) {
          const allOn = params.switches.every((sw: any) => sw.switch === 'on')
          const switchState = allOn ? 'on' : 'off'
          console.log('💡 Multi-channel state:', switchState, 'switches:', params.switches)
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
    const isMultiChannel = deviceId === '1001e7d80b' || deviceId === LIGHT_DEVICE_ID
    
    const params = isMultiChannel ? {
      switches: [
        { outlet: 0, switch: state },
        { outlet: 1, switch: state },
      ]
    } : {
      switch: state,
    }
    
    console.log('🎛️ Control params:', JSON.stringify(params))
    
    const response = await fetch(`${EWELINK_API_URL}/v2/device/thing/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EWELINK_TOKEN}`,
        'X-CK-Appid': EWELINK_APPID,
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
    console.log(`🚪 Gate control - outlet: ${outlet}`)
    
    const response = await fetch(`${EWELINK_API_URL}/v2/device/thing/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EWELINK_TOKEN}`,
        'X-CK-Appid': EWELINK_APPID,
      },
      body: JSON.stringify({
        type: 1,
        id: deviceId,
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
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        device_id: targetDevice,
        command: 'open',
        created_at: new Date().toISOString(),
      }),
    })

    if (response.ok) {
      return { success: true, message: 'Gate open command sent' }
    } else {
      const error = await response.text()
      throw new Error(error)
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
