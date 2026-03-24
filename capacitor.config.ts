import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.mobilepollhub',
  appName: 'mobile-poll-hub',
  webDir: 'dist',
  server: {
    url: 'https://3dc440a9-cec9-433f-8971-1923cb20311e.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
