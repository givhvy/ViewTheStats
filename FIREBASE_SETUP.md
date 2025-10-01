# 🔥 Firebase Setup Guide

## Bước 1: Tạo Firebase Project

1. Vào https://console.firebase.google.com/
2. Click **"Add project"** (hoặc chọn project có sẵn)
3. Đặt tên project: `viewstats` (hoặc tên bạn muốn)
4. Google Analytics: Tắt (không cần) hoặc bật (tùy thích)
5. Click **"Create project"**

## Bước 2: Enable Firestore Database

1. Trong Firebase Console, click **"Firestore Database"** ở menu bên trái
2. Click **"Create database"**
3. Chọn **"Start in production mode"** (hoặc test mode nếu muốn)
4. Chọn location: `asia-southeast1` (Singapore) - gần Việt Nam
5. Click **"Enable"**

## Bước 3: Get Service Account Key

1. Click **⚙️ (Settings icon)** → **"Project settings"**
2. Tab **"Service accounts"**
3. Click **"Generate new private key"**
4. Confirm → Download file JSON (VD: `viewstats-firebase-adminsdk-xxxxx.json`)

## Bước 4: Add to .env file

Mở file JSON vừa download, copy **TOÀN BỘ** nội dung, paste vào `.env`:

```env
YOUTUBE_API_KEY=AIzaSyDL4CViMfkb4RtCSZv4-lDKF48SkNsj5s0
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"viewstats-xxxxx","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",...}
```

**⚠️ CHÚ Ý:** Phải là **1 dòng duy nhất**, không xuống dòng!

## Bước 5: Test

```bash
npm install
npm start
```

Thử add channel, data sẽ lưu vào Firestore!

## Deploy to Vercel

### Cách 1: Convert service account to Base64

```bash
# Windows PowerShell
$json = Get-Content viewstats-firebase-adminsdk-xxxxx.json -Raw
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))
```

Copy output, add vào Vercel:
```
FIREBASE_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50...
```

### Cách 2: Via Vercel Dashboard

1. Push code lên GitHub
2. Import vào Vercel
3. Add Environment Variables:
   - `YOUTUBE_API_KEY`: Your YouTube API key
   - `FIREBASE_SERVICE_ACCOUNT_BASE64`: Base64 encoded service account

## Firestore Rules (Optional - cho bảo mật)

Vào Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /channels/{channelId} {
      allow read: if true;  // Public read
      allow write: if false; // Only server can write
    }
  }
}
```

Xong! 🎉
