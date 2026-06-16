# Voxxy

Vocal and Ear-Training Tools.

---

## Running the app

**1. Start Metro** (keep this running between installs):
```sh
npm start
```

**2. Build and install** (new terminal):
```sh
npx react-native run-android
```

This runs `assembleDebug`, sets up `adb reverse tcp:8081 tcp:8081`, and installs the APK directly. No Gradle ADB hang.

---

## If Metro doesn't connect

The app opens but shows "Unable to load script"? Re-run the reverse forward manually:
```sh
adb reverse tcp:8081 tcp:8081
```
Then shake the device → Reload, or close and reopen the app.

---

## If the device shows as `unauthorized`

Check the phone screen for a **"Allow USB debugging?"** prompt and tap Allow. Then:
```sh
adb kill-server
adb start-server
```
Reconnect the USB cable if the prompt doesn't appear.

---

## Installing without rebuilding

The APK lives at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```
Install it directly:
```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
