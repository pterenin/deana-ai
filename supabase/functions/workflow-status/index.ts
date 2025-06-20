
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const sessionId = url.searchParams.get('session_id')

    // Handle POST requests from n8n (status updates)
    if (req.method === 'POST') {
      console.log('Received POST request for status update')
      
      const rawData = await req.json()
      console.log('Raw data from n8n:', rawData)
      
      // Handle n8n's nested JSON structure
      let statusData
      if (Array.isArray(rawData) && rawData.length > 0 && rawData[0].JSON) {
        statusData = rawData[0].JSON
      } else if (rawData.JSON) {
        statusData = rawData.JSON
      } else {
        statusData = rawData
      }
      
      console.log('Processed status data:', statusData)
      
      // Extract session_id from the data or use a default
      const sessionIdToUse = statusData.session_id || sessionId || 'default'
      
      // Insert status update into database
      const { error } = await supabaseClient
        .from('workflow_status')
        .insert({
          session_id: sessionIdToUse,
          type: statusData.type || 'progress',
          progress: statusData.progress || 0,
          message: typeof statusData.message === 'string' 
            ? statusData.message 
            : statusData.message?.text || null,
          data: statusData.data || null
        })
      
      if (error) {
        console.error('Error inserting status:', error)
        return new Response(JSON.stringify({ error: 'Failed to save status' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Clean up old records periodically
      await supabaseClient.rpc('cleanup_old_workflow_status')
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Handle GET requests from frontend (polling for status)
    if (req.method === 'GET') {
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'session_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      console.log('Polling status for session:', sessionId)
      
      // Get latest status updates for this session
      const { data, error } = await supabaseClient
        .from('workflow_status')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) {
        console.error('Error fetching status:', error)
        return new Response(JSON.stringify({ error: 'Failed to fetch status' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      return new Response(JSON.stringify({ updates: data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
