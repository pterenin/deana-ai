
export const useAudioPlayback = () => {
  const handleAudioPlayback = async (audioBase64: string, messageText: string) => {
    try {
      const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        console.log('Audio playback completed');
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        URL.revokeObjectURL(audioUrl);
        // Fallback to browser speech synthesis
        const utterance = new SpeechSynthesisUtterance(messageText);
        speechSynthesis.speak(utterance);
      };
      
      await audio.play();
    } catch (audioError) {
      console.error('Error playing audio:', audioError);
      // Fallback to browser speech synthesis
      const utterance = new SpeechSynthesisUtterance(messageText);
      speechSynthesis.speak(utterance);
    }
  };

  const playAudioFromDataUrl = async (audioDataUrl: string, messageText: string) => {
    try {
      const audio = new Audio(audioDataUrl);
      audio.onended = () => console.log('Audio playback completed');
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        const utterance = new SpeechSynthesisUtterance(messageText);
        speechSynthesis.speak(utterance);
      };
      await audio.play();
    } catch (audioError) {
      console.error('Error playing audio:', audioError);
      const utterance = new SpeechSynthesisUtterance(messageText);
      speechSynthesis.speak(utterance);
    }
  };

  return {
    handleAudioPlayback,
    playAudioFromDataUrl
  };
};
