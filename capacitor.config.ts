
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.32be9b86b3c54704959651026e5fe3fb',
  appName: 'bubbly-talk-verse-web',
  webDir: 'dist',
  server: {
    url: 'https://32be9b86-b3c5-4704-9596-51026e5fe3fb.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    },
    StatusBar: {
      style: 'light'
    }
  }
};

export default config;
