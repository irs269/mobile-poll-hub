import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuration Capacitor pour la PRODUCTION (Play Store / App Store).
 *
 * Différences avec capacitor.config.ts :
 *  - Pas de `server.url` → l'application charge le build local (dist/) au lieu
 *    de la preview Lovable. Indispensable pour un APK/AAB publiable.
 *
 * Utilisation pour générer un build Play Store :
 *   1. npm run build
 *   2. npx cap copy android --config capacitor.config.prod.ts
 *   3. npx cap sync android --config capacitor.config.prod.ts
 *   4. cd android && ./gradlew bundleRelease
 *      → fichier généré : android/app/build/outputs/bundle/release/app-release.aab
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.waswiacac',
  appName: 'WASWIA',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
