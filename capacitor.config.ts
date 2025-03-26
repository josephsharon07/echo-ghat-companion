import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.echoghat.companion',
  appName: 'EchoGhat Companion',
  webDir: 'out',
  plugins: {
    Geolocation: {
      permissions: {
        permissions: true
      }
    }
  }
};

export default config;
