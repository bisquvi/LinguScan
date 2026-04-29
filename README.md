# OCR & Translation Flashcard App

Bu proje; yüklenen görsellerdeki İngilizce metinleri OCR ile algılayan, çeviren ve bunları aralıklı tekrar mantığıyla çalıştıran tam yığın bir uygulamadır.

## Klasör Yapısı
- `backend/`: FastAPI API’si, veritabanı erişimi, OCR ve çeviri servisleri.
- `frontend/`: Expo / React Native istemcisi.
- `docker-compose.yml`: Veritabanı, backend ve Ollama servislerini birlikte ayağa kaldıran compose dosyası.

## Kurulum

### Gereksinimler
- Docker ve Docker Compose
- Frontend’i yerelde çalıştırmak için Node.js 18+

### Backend
Proje kök dizininde:

```cmd
docker compose up -d --build
```

API varsayılan olarak `http://localhost:8000` adresinde açılır.

Ollama modelini ayrıca çekmek isterseniz:

```cmd
docker compose exec ollama ollama run llama3
```

GPU kullanmak isterseniz `docker-compose.yml` içindeki yorum satırındaki `deploy` bloklarını kendi ortamınıza göre açabilirsiniz.

### Frontend

```cmd
cd frontend
npm install
npm start
```

## Kimlik Doğrulama
- Deste, cümle destesi, quiz ve kullanıcı ayarları endpoint’leri giriş gerektirir.
- Varsayılan demo kullanıcı artık otomatik oluşturulmaz.
- Sadece özellikle istenirse `SEED_DEMO_USER=true` ile geliştirme ortamında örnek kullanıcı eklenebilir.

## Ortam Değişkenleri
`.env.example` içindeki değişkenleri kendi ortamınıza göre doldurun.

Özellikle:
- `DATABASE_URL`: Veritabanı bağlantısı
- `OLLAMA_URL`: Ollama API adresi
- `CORS_ALLOW_ORIGINS`: Virgülle ayrılmış izinli origin listesi
- `SEED_DEMO_USER`: Sadece development için opsiyonel demo kullanıcı üretimi

## Kullanım
1. Görsel seçin ve OCR sonucunu alın.
2. Kelime veya cümle kutularına tıklayarak çeviriyi görüntüleyin.
3. Giriş yaptıktan sonra sonuçları destelere ekleyin ve quiz başlatın.
