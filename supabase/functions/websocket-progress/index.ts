
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const connections = new Map<string, WebSocket>()

serve(async (req) => {
  const url = new URL(req.url)
  
  // Handle WebSocket upgrade
  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req)
    const connectionId = crypto.randomUUID()
    
    socket.onopen = () => {
      console.log(`WebSocket connected: ${connectionId}`)
      connections.set(connectionId, socket)
      
      // Send connection confirmation
      socket.send(JSON.stringify({
        type: 'connected',
        connectionId: connectionId
      }))
    }
    
    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('Received message:', message)
        
        if (message.type === 'message') {
          // Process the message with n8n workflow
          await processWithN8nWorkflow(socket, message.message)
        }
      } catch (error) {
        console.error('Error processing message:', error)
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Error processing your request'
        }))
      }
    }
    
    socket.onclose = () => {
      console.log(`WebSocket disconnected: ${connectionId}`)
      connections.delete(connectionId)
    }
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error)
      connections.delete(connectionId)
    }
    
    return response
  }
  
  // Handle HTTP progress updates from n8n (for external webhooks)
  if (req.method === 'POST') {
    try {
      const rawData = await req.json()
      console.log('Received HTTP progress update (raw):', rawData)
      
      // Handle n8n's nested JSON structure
      let progressData
      if (Array.isArray(rawData) && rawData.length > 0 && rawData[0].JSON) {
        // n8n format: [{ "JSON": { "type": "progress", ... } }]
        progressData = rawData[0].JSON
      } else if (rawData.JSON) {
        // Alternative n8n format: { "JSON": { "type": "progress", ... } }
        progressData = rawData.JSON
      } else {
        // Direct format: { "type": "progress", ... }
        progressData = rawData
      }
      
      console.log('Processed progress data:', progressData)
      
      // Broadcast progress to all connected WebSocket clients
      connections.forEach((socket, connectionId) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(progressData))
        } else {
          connections.delete(connectionId)
        }
      })
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    } catch (error) {
      console.error('Error processing HTTP progress update:', error)
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400
      })
    }
  }
  
  // Handle GET requests (for testing)
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      message: 'WebSocket Progress Service',
      connected_clients: connections.size,
      endpoint: 'Use WebSocket upgrade or POST for progress updates'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  }
  
  // Default response for unsupported methods
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 405
  })
})

async function processWithN8nWorkflow(socket: WebSocket, userMessage: string) {
  try {
    console.log('Processing message with n8n workflow:', userMessage)
    
    // Send initial progress
    socket.send(JSON.stringify({
      type: 'progress',
      progress: 10,
      message: 'Starting workflow...'
    }))

    // Make the HTTP request to n8n webhook
    const encodedMessage = encodeURIComponent(userMessage)
    const n8nUrl = `https://pterenin.app.n8n.cloud/webhook/request-assistence?message=${encodedMessage}`
    console.log('Calling n8n webhook:', n8nUrl)

    const response = await fetch(n8nUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const result = await response.json()
      console.log('n8n response received:', result)

      // Send completion progress
      socket.send(JSON.stringify({
        type: 'progress',
        progress: 100,
        message: 'Response ready!'
      }))

      // Send the actual response as a message
      if (Array.isArray(result) && result.length > 0) {
        const responseItem = result[0]
        const notification = responseItem.notification
        
        if (notification) {
          console.log('Sending notification message:', notification.text)
          socket.send(JSON.stringify({
            type: 'message',
            message: notification.text,
            data: {
              audio: notification.audio
            }
          }))
        } else {
          // Fallback format
          const fallbackMessage = responseItem.text || responseItem.output || 'Response received from n8n'
          console.log('Sending fallback message:', fallbackMessage)
          socket.send(JSON.stringify({
            type: 'message',
            message: fallbackMessage
          }))
        }
      } else {
        console.log('Unexpected response format from n8n')
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Received unexpected response format from workflow'
        }))
      }
    } else {
      console.error(`n8n webhook returned ${response.status}`)
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error('Error calling n8n webhook:', error)
    socket.send(JSON.stringify({
      type: 'error',
      message: 'Sorry, I encountered an error processing your request. Please try again.'
    }))
  }
}
