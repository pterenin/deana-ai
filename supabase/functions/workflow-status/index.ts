
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
      console.log('Raw data from n8n:', JSON.stringify(rawData, null, 2))
      
      // Handle n8n's nested JSON structure
      let statusData
      if (Array.isArray(rawData) && rawData.length > 0) {
        statusData = rawData[0]
      } else {
        statusData = rawData
      }
      
      console.log('Processed status data:', JSON.stringify(statusData, null, 2))
      
      // Create a simplified message for display
      let displayMessage = ''
      let sessionIdToUse = 'default'
      let messageType = 'message'
      
      // Handle different message formats
      if (statusData.notification && statusData.notification.text) {
        displayMessage = statusData.notification.text
        messageType = 'complete'
        // For n8n responses, we'll use a generic session ID that can be matched
        sessionIdToUse = 'active_session'
      } else if (statusData.message) {
        if (typeof statusData.message === 'string') {
          displayMessage = statusData.message
        } else if (statusData.message.tool && statusData.message.action) {
          displayMessage = `${statusData.message.tool}: ${statusData.message.action}`
        } else if (statusData.message.info) {
          displayMessage = statusData.message.info
        } else if (statusData.message.text) {
          displayMessage = statusData.message.text
        } else {
          displayMessage = JSON.stringify(statusData.message)
        }
        sessionIdToUse = statusData.session_id ? statusData.session_id.toString() : 'active_session'
      } else if (statusData.text) {
        displayMessage = statusData.text
        messageType = 'complete'
        sessionIdToUse = 'active_session'
      }
      
      console.log('Final display message:', displayMessage)
      console.log('Session ID to use:', sessionIdToUse)
      
      // Insert status update into database
      const { error } = await supabaseClient
        .from('workflow_status')
        .insert({
          session_id: sessionIdToUse,
          type: messageType,
          progress: statusData.progress || 100,
          message: displayMessage,
          data: statusData.notification?.audio ? { audio: statusData.notification.audio } : null
        })
      
      if (error) {
        console.error('Error inserting status:', error)
        return new Response(JSON.stringify({ error: 'Failed to save status' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      console.log('Status update saved successfully')
      
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
      
      // Get latest status updates - check for exact match or 'active_session'
      const { data, error } = await supabaseClient
        .from('workflow_status')
        .select('*')
        .or(`session_id.eq.${sessionId},session_id.eq.active_session`)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) {
        console.error('Error fetching status:', error)
        return new Response(JSON.stringify({ error: 'Failed to fetch status' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      console.log('Found status updates:', data?.length || 0)
      console.log('Status updates:', JSON.stringify(data, null, 2))
      
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
