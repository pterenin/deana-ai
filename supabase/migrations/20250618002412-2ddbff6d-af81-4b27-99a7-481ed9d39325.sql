
-- Create a table for ElevenLabs configuration
CREATE TABLE public.elevenlabs_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key TEXT NOT NULL,
  voice_id TEXT DEFAULT '9BWtsMINqrJLrRacOk9x',
  model TEXT DEFAULT 'eleven_multilingual_v2',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert the provided API key
INSERT INTO public.elevenlabs_config (api_key) 
VALUES ('sk_1dd8500bc9503a0f52d07ab4277c7c2c955000f5d4990c73');

-- Enable Row Level Security (make it publicly readable since it's app configuration)
ALTER TABLE public.elevenlabs_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to the configuration
CREATE POLICY "Allow public read access to elevenlabs config" 
  ON public.elevenlabs_config 
  FOR SELECT 
  TO public
  USING (true);
