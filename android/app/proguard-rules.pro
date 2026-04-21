# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Hata izleri için satır numaralarını koru
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor + WebView köprüsü
-keep class com.getcapacitor.** { *; }
-keep class com.oyuncak.app.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
}

# WebView JS arayüzleri
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# AndroidX & Material
-keep class androidx.** { *; }
-dontwarn androidx.**

# Google Services (Firebase) — varsa
-keep class com.google.** { *; }
-dontwarn com.google.**
