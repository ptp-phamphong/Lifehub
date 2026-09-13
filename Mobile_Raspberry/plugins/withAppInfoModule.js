const { withDangerousMod, withMainApplication, withAndroidManifest } = require('expo/config-plugins');
const { mkdirSync, writeFileSync } = require('fs');
const { resolve } = require('path');

/**
 * Expo config plugin: thêm native module AppInfoModule cho Android.
 *
 * Module này dùng PackageManager API để:
 * - Lấy tên hiển thị của app từ package name (ví dụ: com.facebook.orca → Messenger)
 * - Lấy icon của app dưới dạng base64 PNG
 *
 * Đây là cơ chế mà các app đọc thông báo (Unseen, smartwatch companion, ...)
 * sử dụng để hiển thị đúng tên và logo app.
 *
 * Quan trọng: Từ Android 11 (API 30), cần permission QUERY_ALL_PACKAGES
 * để PackageManager có thể "nhìn thấy" các app khác đã cài trên máy.
 * Nếu thiếu permission này, getApplicationInfo() sẽ throw NameNotFoundException
 * cho hầu hết app (trừ system apps).
 */

const APP_INFO_MODULE_JAVA = `package com.phamphong.lifehub.appinfo;

import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.AdaptiveIconDrawable;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.LayerDrawable;
import android.os.Build;
import android.util.Base64;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.io.ByteArrayOutputStream;

/**
 * Native module cung cap thong tin app tu package name.
 * Su dung PackageManager API cua Android.
 */
public class AppInfoModule extends ReactContextBaseJavaModule {

    public AppInfoModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "AppInfoModule";
    }

    /**
     * Lay ten hien thi cua app tu package name.
     * Ví du: "com.facebook.orca" -> "Messenger"
     */
    @ReactMethod
    public void getAppName(String packageName, Promise promise) {
        try {
            PackageManager pm = getReactApplicationContext().getPackageManager();
            ApplicationInfo ai = pm.getApplicationInfo(packageName, 0);
            promise.resolve(pm.getApplicationLabel(ai).toString());
        } catch (PackageManager.NameNotFoundException e) {
            promise.resolve(packageName);
        }
    }

    /**
     * Lay icon cua app duoi dang base64 PNG.
     */
    @ReactMethod
    public void getAppIcon(String packageName, Promise promise) {
        try {
            PackageManager pm = getReactApplicationContext().getPackageManager();
            ApplicationInfo ai = pm.getApplicationInfo(packageName, 0);
            Drawable icon = pm.getApplicationIcon(ai);
            promise.resolve(drawableToBase64(icon));
        } catch (PackageManager.NameNotFoundException e) {
            promise.resolve("");
        }
    }

    /**
     * Lay ca ten + icon cua app trong 1 lan goi.
     */
    @ReactMethod
    public void getAppInfo(String packageName, Promise promise) {
        try {
            PackageManager pm = getReactApplicationContext().getPackageManager();
            ApplicationInfo ai = pm.getApplicationInfo(packageName, 0);
            String label = pm.getApplicationLabel(ai).toString();
            String iconBase64 = drawableToBase64(pm.getApplicationIcon(ai));

            WritableMap result = Arguments.createMap();
            result.putString("name", label);
            result.putString("icon", iconBase64);
            result.putString("packageName", packageName);
            promise.resolve(result);
        } catch (PackageManager.NameNotFoundException e) {
            WritableMap result = Arguments.createMap();
            result.putString("name", packageName);
            result.putString("icon", "");
            result.putString("packageName", packageName);
            promise.resolve(result);
        }
    }

    private String drawableToBase64(Drawable drawable) {
        try {
            Bitmap bitmap;
            int size = 72;
            if (drawable instanceof BitmapDrawable) {
                bitmap = ((BitmapDrawable) drawable).getBitmap();
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                       && drawable instanceof AdaptiveIconDrawable) {
                // Android 8+ Adaptive Icons: vẽ foreground lên background
                bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                drawable.setBounds(0, 0, size, size);
                drawable.draw(canvas);
            } else {
                int w = Math.max(drawable.getIntrinsicWidth(), 1);
                int h = Math.max(drawable.getIntrinsicHeight(), 1);
                bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                drawable.setBounds(0, 0, w, h);
                drawable.draw(canvas);
            }
            bitmap = Bitmap.createScaledBitmap(bitmap, size, size, true);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, baos);
            return Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return "";
        }
    }
}
`;

const APP_INFO_PACKAGE_JAVA = `package com.phamphong.lifehub.appinfo;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class AppInfoPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new AppInfoModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

function withAppInfoModule(config) {
  // Bước 0: Thêm QUERY_ALL_PACKAGES permission vào AndroidManifest
  // Bắt buộc từ Android 11 (API 30) để PackageManager có thể nhìn thấy
  // tất cả app đã cài trên máy. Thiếu permission này sẽ khiến
  // getApplicationInfo() throw NameNotFoundException cho hầu hết app.
  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permName = 'android.permission.QUERY_ALL_PACKAGES';
    const hasPermission = manifest['uses-permission'].some(
      (p) => p.$?.['android:name'] === permName
    );

    if (!hasPermission) {
      manifest['uses-permission'].push({
        $: { 'android:name': permName },
      });
    }

    return modConfig;
  });

  // Bước 1: Tạo Java source files trong android project
  config = withDangerousMod(config, [
    'android',
    (modConfig) => {
      const projectRoot = modConfig.modRequest.platformProjectRoot;
      const javaDir = resolve(
        projectRoot,
        'app/src/main/java/com/phamphong/lifehub/appinfo'
      );
      mkdirSync(javaDir, { recursive: true });
      writeFileSync(resolve(javaDir, 'AppInfoModule.java'), APP_INFO_MODULE_JAVA);
      writeFileSync(resolve(javaDir, 'AppInfoPackage.java'), APP_INFO_PACKAGE_JAVA);
      return modConfig;
    },
  ]);

  // Bước 2: Đăng ký AppInfoPackage trong MainApplication
  config = withMainApplication(config, (modConfig) => {
    let contents = modConfig.modResults.contents;
    const language = modConfig.modResults.language;

    if (contents.includes('AppInfoPackage')) {
      return modConfig;
    }

    if (language === 'kt' || language === 'kotlin') {
      // Kotlin MainApplication
      const importLine = 'import com.phamphong.lifehub.appinfo.AppInfoPackage';

      // Thêm import
      const lastImportIdx = contents.lastIndexOf('import ');
      const eol = contents.indexOf('\n', lastImportIdx);
      contents =
        contents.slice(0, eol + 1) + importLine + '\n' + contents.slice(eol + 1);

      // Thêm vào getPackages() - Pattern 1: .apply { }
      if (contents.includes('.apply {')) {
        contents = contents.replace(
          /\.apply\s*\{/,
          '.apply {\n        add(AppInfoPackage())'
        );
      }
      // Pattern 2: return packages
      else if (contents.includes('return packages')) {
        contents = contents.replace(
          'return packages',
          'packages.add(AppInfoPackage())\n          return packages'
        );
      }
    } else {
      // Java MainApplication
      const importLine = 'import com.phamphong.lifehub.appinfo.AppInfoPackage;';

      const lastImportIdx = contents.lastIndexOf('import ');
      const eol = contents.indexOf('\n', lastImportIdx);
      contents =
        contents.slice(0, eol + 1) + importLine + '\n' + contents.slice(eol + 1);

      if (contents.includes('return packages;')) {
        contents = contents.replace(
          'return packages;',
          'packages.add(new AppInfoPackage());\n          return packages;'
        );
      }
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });

  return config;
}

module.exports = withAppInfoModule;
