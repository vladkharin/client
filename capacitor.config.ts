import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ru.crafthive.app',
  appName: 'CraftHive',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: 'https://crafthive.ru',
    cleartext: true,
  },
};

export default config;
