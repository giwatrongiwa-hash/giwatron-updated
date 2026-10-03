# GIWATRON — Netlify kurulumu

Bu proje Next.js sunucu API’leri kullanır. ZIP’i Netlify Drop’a sürüklemek yeterli değildir.

1. ZIP’i açın. giwatron-netlify klasörünün içeriğini GitHub deposunun köküne yükleyin.
2. Netlify: Add new project → Import an existing project ile depoyu seçin.
3. Build command: npm run build; Publish directory: .next; Node: 22. netlify.toml bunları tanımlar.
4. Deploy öncesinde Netlify ortam değişkenlerine aşağıdaki değerleri ekleyin (Functions ve Builds kapsamları):
   - UPSTASH_REDIS_REST_URL: mevcut veritabanının REST URL’si.
   - UPSTASH_REDIS_REST_TOKEN: Upstash’taki gerçek REST token; sohbette paylaşılan token’ı önce yenileyin.
   - GAME_SECRET: en az 32 karakterlik rastgele gizli değer.
   - SESSION_SECRET: farklı, en az 32 karakterlik rastgele gizli değer.
   Anahtar üretmek için: node scripts/generate-secrets.mjs
   ADMIN_TOKEN_HASH yalnızca yönetici API’sini kullanacaksanız gereklidir; üretilen ADMIN_TOKEN değerini parola yöneticisinde saklayın.
5. Deploy edin. Canlı adreste whitelist kaydı ve oyun skoru gönderimini test edin; Upstash Data Browser’dan doğrulayın.

Gizli değerler ZIP’e dahil edilmedi. Mevcut Upstash veritabanı kullanılırsa kayıtlar korunur.
Vercel cron ayarı Netlify’da çalışmaz: günlük otomatik yedek bu pakette etkin değildir. Asıl kayıtlar Upstash’ta kalıcıdır.
Görev bağlantısı: https://x.com/Giwatron/status/2104687698011390279
Görevler: Follow; Like the tweet; Reply & quote the tweet. Mevcut doğrulama, görev bağlantılarının açılmasını ve 30 saniyelik beklemeyi kontrol eder; gerçek X etkileşimini doğrulamaz.

https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
