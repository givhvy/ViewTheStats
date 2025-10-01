# 🚀 Deploy to Vercel

## Prerequisites

### 1. MongoDB Atlas (Free Database)
1. Tạo tài khoản tại: https://www.mongodb.com/cloud/atlas
2. Tạo cluster miễn phí (M0)
3. Tạo database user (username + password)
4. Add IP `0.0.0.0/0` vào Network Access (cho phép tất cả)
5. Copy connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/viewstats
   ```

### 2. YouTube API Key
Đã có từ phần trước

## Deploy Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
vercel
```

Làm theo hướng dẫn:
- Set up and deploy? `Y`
- Which scope? Chọn tài khoản của bạn
- Link to existing project? `N`
- Project name? `viewstats` (hoặc tên bạn muốn)
- Which directory? `./`
- Override settings? `N`

### 4. Add Environment Variables

Sau khi deploy lần đầu, thêm biến môi trường:

```bash
vercel env add YOUTUBE_API_KEY
# Paste your YouTube API key

vercel env add MONGODB_URI
# Paste your MongoDB connection string
```

Chọn:
- Production? `Y`
- Preview? `Y`
- Development? `Y`

### 5. Deploy lại để áp dụng env vars
```bash
vercel --prod
```

## Hoặc Deploy qua Vercel Dashboard

1. Push code lên GitHub
2. Vào https://vercel.com/new
3. Import repository
4. Add environment variables:
   - `YOUTUBE_API_KEY`: Your YouTube API key
   - `MONGODB_URI`: Your MongoDB connection string
5. Deploy!

## Testing

Sau khi deploy xong, Vercel sẽ cho bạn URL:
```
https://viewstats-xxx.vercel.app
```

Test các endpoint:
- Frontend: `https://your-domain.vercel.app`
- API Health: `https://your-domain.vercel.app/api/health`

## Notes

- ✅ Vercel tự động build và deploy
- ✅ Free SSL certificate
- ✅ Global CDN
- ✅ Auto-scaling
- ✅ Free tier: 100GB bandwidth/tháng
