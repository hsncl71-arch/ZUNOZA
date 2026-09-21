# Capacitor / ZUNOZA release. minifyEnabled is false until a signed Play build;
# these keeps are ready so turning minify on later does not strip the bridge.
-keep class com.getcapacitor.** { *; }
-keep class app.zunoza.mobile.** { *; }
-dontwarn com.getcapacitor.**
