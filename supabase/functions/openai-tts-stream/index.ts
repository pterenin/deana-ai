
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = 'nova', instructions, response_format = 'mp3' } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Generating streaming TTS with voice:', voice, 'format:', response_format, 'and instructions:', instructions);

    // Prepare the request body for OpenAI TTS API with streaming support
    const requestBody: any = {
      model: 'tts-1',
      input: text,
      voice: voice,
      response_format: response_format,
    };

    // Add instructions if provided
    if (instructions) {
      requestBody.instructions = instructions;
    }

    // Call OpenAI TTS API for streaming
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS API error:', errorText);
      throw new Error(`OpenAI TTS API error: ${response.status}`);
    }

    // Get the audio content type based on format
    const contentType = response_format === 'mp3' ? 'audio/mpeg' : 
                       response_format === 'wav' ? 'audio/wav' : 
                       response_format === 'opus' ? 'audio/opus' :
                       response_format === 'aac' ? 'audio/aac' :
                       response_format === 'flac' ? 'audio/flac' :
                       'audio/mpeg';

    // Stream the audio response back to the client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('TTS streaming error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
