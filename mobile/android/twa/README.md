# GramorX Trusted Web Activity (TWA)

This module wraps the production Progressive Web App at https://gramorx.com in a Trusted Web Activity so it can be published to the Google Play Store. The build uses the `com.google.androidbrowserhelper` tooling, delegates push notifications, and supports file uploads by default.

## Project layout

- [`build.gradle`](./build.gradle) – Android application module configuration.
- [`src/main/AndroidManifest.xml`](./src/main/AndroidManifest.xml) – declares the Trusted Web Activity launcher, delegated origins for push/file uploads, and maps the default URL to the production domain.
- [`src/main/res/xml/network_security_config.xml`](./src/main/res/xml/network_security_config.xml) – pins HTTPS traffic to `gramorx.com` and subdomains.
- [`assetlinks.json`](./assetlinks.json) – Digital Asset Links statement mirrored on the web app under `/.well-known/assetlinks.json`.

## Requirements

1. **Java 17** and the **Android SDK** (API level 34).
2. **Gradle 8** and the Android Gradle Plugin 8.2.x (bundled via the root `mobile/android/app/build.gradle`).
3. The [Android Browser Helper](https://github.com/GoogleChrome/android-browser-helper) Gradle plugin, pulled automatically from Maven Central.

Install the [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap) if you prefer interactive scaffolding and Play Store publishing helpers:

```bash
npm install -g @bubblewrap/cli
bubblewrap updateConfig --appVersionName 1.0.0
```

## Keystore and signing

1. **Create or import the release keystore.** The recommended approach is to generate a dedicated upload key once and store the `.jks` file in your secrets manager:
   ```bash
   keytool -genkeypair \
     -alias upload \
     -keyalg RSA \
     -keysize 2048 \
     -validity 10000 \
     -storepass "<STORE_PASSWORD>" \
     -keypass "<KEY_PASSWORD>" \
     -keystore upload-key.jks
   ```
2. **Configure local environment variables** before running Gradle so the signing block in `build.gradle` can locate the keystore:
   ```bash
   export ANDROID_KEYSTORE="/secure/path/upload-key.jks"
   export ANDROID_KEYSTORE_PASSWORD="<STORE_PASSWORD>"
   export ANDROID_KEY_ALIAS="upload"
   export ANDROID_KEY_PASSWORD="<KEY_PASSWORD>"
   ```
3. **Capture the SHA-256 fingerprint** that must appear in both `assetlinks.json` files and the Play Console. Replace `<KEYSTORE>` with your keystore path:
   ```bash
   keytool -list -v -alias "$ANDROID_KEY_ALIAS" -keystore "$ANDROID_KEYSTORE" | grep 'SHA256:'
   ```
   Update the fingerprint in:
   - [`mobile/android/twa/assetlinks.json`](./assetlinks.json)
   - [`pages/.well-known/assetlinks.json`](../../../pages/.well-known/assetlinks.json)

## Building and releasing

1. **Assemble a release bundle**:
   ```bash
   cd mobile/android
   ./gradlew :twa:bundleRelease
   ```
   The output `app-release.aab` lives under `mobile/android/twa/build/outputs/bundle/release/` and is ready for Play Console upload.
2. **Generate Play signing keys if prompted** in the Play Console and register the upload certificate fingerprint. Ensure the console fingerprint matches the one committed above.
3. **Verify Digital Asset Links** after deployment:
   - Serve `https://gramorx.com/.well-known/assetlinks.json` and confirm it matches the module copy.
   - Run `adb shell am start -a android.intent.action.VIEW -d https://gramorx.com` on a device with the app installed. Chrome should open inside the TWA without displaying the URL bar.

## QA checklist for push & file uploads

1. **Push notifications delegation**
   - Install the release build on a device running Android 13+.
   - Visit `https://gramorx.com` inside the TWA and grant the notification permission prompt.
   - Trigger a test push (e.g., via Supabase or the staging push endpoint) and confirm it arrives while the TWA is foregrounded and backgrounded.
   - Validate `adb logcat | grep DelegationService` shows no delegation errors.
2. **File uploads & captures**
   - From any form inside the PWA, open a file picker (e.g., profile photo upload) and ensure the native document picker appears.
   - Test camera capture by selecting the camera option; verify the photo uploads successfully.
   - Confirm `content://com.gramorx.twa.fileprovider/...` URIs are produced in the logs.
3. **Chrome verification commands**
   ```bash
   adb shell dumpsys activity services | grep -A2 gramorx
   adb shell pm get-app-links com.gramorx.twa
   ```
   These commands confirm the Play Store build trusts the declared delegates and the app-link verification has passed.

## Release checklist summary

- [ ] Keystore stored securely and environment variables configured.
- [ ] SHA-256 fingerprint confirmed in both Asset Links manifests and the Play Console.
- [ ] Release bundle generated and uploaded to the appropriate Play track.
- [ ] Push notifications tested end-to-end in a signed build.
- [ ] File uploads (document picker + camera capture) verified in the Trusted Web Activity.
