import { useState, useEffect } from 'react';

interface ElevenLabsConfig {
  voice_id: string;
  model: string;
}

export const useElevenLabsConfig = () => {
  const [config, setConfig] = useState<ElevenLabsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Since we're using OpenAI TTS now, we'll return null for ElevenLabs config
    // but keep the hook structure for compatibility
    setConfig(null);
    setLoading(false);
  }, []);

  return { config, loading };
};
