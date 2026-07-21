# Voxxy

Vocal and Ear-Training Tools.

---

## 1. Connect your device

### USB (simplest)

Plug in the phone, enable **USB debugging** (Settings → Developer Options → USB debugging), then verify:
```sh
adb devices
```
You should see `RFCX30ZP0QW device`. If it shows `unauthorized`, check the phone screen for an **"Allow USB debugging?"** prompt and tap Allow. Then:
```sh
adb kill-server
adb start-server
```
Reconnect the USB cable if the prompt doesn't reappear.

### Wireless (same Wi-Fi network, Android 11+)

```sh
adb tcpip 5555
adb connect <phone-ip>:5555
adb devices
```
Find the phone IP under Settings → About phone → Status → IP address. After connecting wirelessly you can unplug USB.

### Emulator

Start an AVD from Android Studio (or `emulator -avd <name>`). It appears automatically in `adb devices` as `emulator-5554`.

---

## 2. (Dev container only) Forward ADB to Windows host

If you're running inside a WSL2 dev container, the container's `adb` can't reach USB devices directly. Run these steps **on Windows** (PowerShell or CMD), not inside the container.

**Start the Windows ADB server listening on all interfaces:**
```powershell
adb -a nodaemon server
```
Leave this running (it's foreground). Open a new terminal for everything else.

**If the port is already in use:**
```powershell
netstat -ano | findstr :5037
taskkill /F /PID <pid>
```
Then re-run the `adb -a nodaemon server` command above.

**Verify the container can see the device:**

From inside the container:
```sh
adb devices
```
Should show `RFCX30ZP0QW device`. If it shows nothing, the Windows ADB server may not be running, or the container's `ANDROID_ADB_SERVER_ADDRESS` env var isn't set — check your `devcontainer.json` for that setting.

---

## 3. Start Metro

Keep this running between installs (new terminal, inside the container or WSL):
```sh
npm start
```

---

## 4. Build and install

```sh
npx react-native run-android
```

This runs `assembleDebug`, sets `adb -s RFCX30ZP0QW reverse tcp:8081 tcp:8081`, and installs the APK. Do **not** use `installDebug` — it hangs at 99% in the dev container.

---

## Troubleshooting

### Metro doesn't connect ("Unable to load script")

Re-run the port forward manually:
```sh
adb -s RFCX30ZP0QW reverse tcp:8081 tcp:8081
```
Then shake the device → Reload, or close and reopen the app.

### Install hangs at 99%

Don't use `run-android`. Install the APK directly, targeting the device serial:
```sh
adb -s RFCX30ZP0QW install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Installing without rebuilding

The APK lives at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```
Same direct install command as above.

### Device shows `unauthorized`

Check the phone for the **"Allow USB debugging?"** prompt → tap Allow. Then:
```sh
adb kill-server
adb start-server
```
Reconnect USB if the prompt doesn't appear.

---

## 5. Bump version before a release

### Android

Edit `android/app/build.gradle`:
```groovy
versionCode 1        // integer, increment by 1 each release (Play Store requires unique)
versionName "0.0.1"    // human-readable string shown to users
```

Then build a release APK:
```sh
cd android && ./gradlew assembleRelease
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

### iOS

Edit `ios/Voxxy.xcodeproj/project.pbxproj` (two occurrences, Debug and Release):
```
CURRENT_PROJECT_VERSION = 1;   // build number — increment each App Store submission
MARKETING_VERSION = 1.0;       // version string shown to users
```

Or open Xcode → select the `Voxxy` target → **General** tab → Identity section and edit there. Build for release via Xcode: **Product → Archive**.
