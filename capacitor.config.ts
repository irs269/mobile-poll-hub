import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.waswiacac',
  appName: 'WASWIA - CAC International Bank Comores',
  webDir: 'dist',
  server: {
    url: 'https://3dc440a9-cec9-433f-8971-1923cb20311e.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
