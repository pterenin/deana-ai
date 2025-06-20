
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

console.log('Starting WebSocket server on port 8080...');

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', message);

      if (message.type === 'message') {
        // Simulate processing with progress updates
        await simulateN8nWorkflow(ws, message.message);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error processing your request'
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

async function simulateN8nWorkflow(ws, userMessage) {
  // Send initial progress
  ws.send(JSON.stringify({
    type: 'progress',
    progress: 10,
    message: 'Starting workflow...'
  }));

  await sleep(1000);

  // Send progress updates
  ws.send(JSON.stringify({
    type: 'progress',
    progress: 30,
    message: 'Processing your request...'
  }));

  await sleep(1500);

  ws.send(JSON.stringify({
    type: 'progress',
    progress: 60,
    message: 'Analyzing data...'
  }));

  await sleep(1000);

  ws.send(JSON.stringify({
    type: 'progress',
    progress: 80,
    message: 'Generating response...'
  }));

  await sleep(1000);

  // Make actual HTTP request to n8n webhook
  try {
    const encodedMessage = encodeURIComponent(userMessage);
    const response = await fetch(`https://pterenin.app.n8n.cloud/webhook/request-assistence?message=${encodedMessage}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log('n8n response:', result);

      ws.send(JSON.stringify({
        type: 'progress',
        progress: 100,
        message: 'Finalizing response...'
      }));

      await sleep(500);

      // Send the actual response
      if (Array.isArray(result) && result.length > 0) {
        const responseItem = result[0];
        const notification = responseItem.notification;
        
        if (notification) {
          ws.send(JSON.stringify({
            type: 'complete',
            message: notification.text,
            data: {
              audio: notification.audio
            }
          }));
        } else {
          // Fallback format
          ws.send(JSON.stringify({
            type: 'complete',
            message: responseItem.text || responseItem.output || 'Response received from n8n'
          }));
        }
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('Error calling n8n webhook:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Sorry, I encountered an error processing your request. Please try again.'
    }));
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

server.listen(8080, () => {
  console.log('WebSocket server listening on port 8080');
  console.log('You can now connect to ws://localhost:8080');
});
