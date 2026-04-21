# Android Release İmzalama

Release build (Play Store / üretim APK/AAB) için imzalama yapılandırması `app/build.gradle` içinde `signingConfigs.release` olarak tanımlıdır. Keystore bilgilerini **asla** repo'ya commitlemeyin.

## 1. Keystore oluştur

```bash
keytool -genkey -v -keystore oyuncak-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias oyuncak
```

## 2. Yerel makinede

`~/.gradle/gradle.properties` (global) veya `android/gradle.properties` (proje) içine ekleyin:

```properties
OYUNCAK_KEYSTORE_FILE=/absolute/path/to/oyuncak-release.jks
OYUNCAK_KEYSTORE_PASSWORD=...
OYUNCAK_KEY_ALIAS=oyuncak
OYUNCAK_KEY_PASSWORD=...
```

> Proje içindeki `android/gradle.properties` kullanılacaksa dosyayı `.gitignore` listesine ekleyin.

## 3. CI ortamında

Aşağıdaki ortam değişkenlerini ayarlayın:

- `OYUNCAK_KEYSTORE_FILE`
- `OYUNCAK_KEYSTORE_PASSWORD`
- `OYUNCAK_KEY_ALIAS`
- `OYUNCAK_KEY_PASSWORD`

## 4. Build

```bash
npm run apk:release
```

Oluşan APK: `android/app/build/outputs/apk/release/app-release.apk`
