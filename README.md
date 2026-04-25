# OCR & Translation Flashcard App

Bu proje; yüklenen görsellerin üzerindeki İngilizce metinleri tespit eden (EasyOCR), yerel çalışan Llama3 modeliyle çevirisini yapan (Ollama) ve bu kelimeleri Spaced Repetition (Aralıklı Tekrar) yöntemiyle öğrenmenizi sağlayan (SM-2) tam yığın (full-stack) bir uygulamadır.

## Klasör Yapısı
- `backend/`: FastAPI, PostgreSQL veritabanı bağlantısı, EasyOCR ve Ollama entegrasyonlarını içeren Python kodları.
- `frontend/`: React Native (Expo) tabanlı, interaktif OCR kutucuklarını ve kart çalışma (Quiz) ekranlarını barındıran mobil arayüz.
- `docker-compose.dev.yml` / `docker-compose.prod.yml`: Veritabanı, Backend ve Ollama'yı tek komutla ayağa kaldıran yapılandırmalar.

## Kurulum ve Çalıştırma

### 1 önkoşul
- Bilgisayarınızda **Docker** ve **Docker Compose** kurulu olmalıdır.
- (Eğer kendi cihazınızda test edecekseniz) Frontend için bilgisayarınızda **Node.js** (v18+) kurulu olmalıdır.

### Adım 1: Backend Ayağa Kaldırma
Proje dizininde aşağıdaki komutu çalıştırarak backend, veritabanı ve Ollama'yı başlatın:

```cmd
docker-compose -f docker-compose.dev.yml up -d --build
```

**Önemli Not (Ollama Modeli):**
Ollama kullanabilmek için seçtiğiniz modelin yüklü olması gerekir. `.env` dosyanızda belirlediğiniz modeli (varsayılan: `llama3`) şu komutla indirebilirsiniz (eğer daha hafif bir model istiyorsanız `.env` içinde `OLLAMA_MODEL=phi3` yapıp `phi3` indirebilirsiniz):
```cmd
docker-compose -f docker-compose.dev.yml exec ollama ollama run llama3
```

**Production & GPU Pass-through:**
Eğer uygulamayı canlı sunucuya (Production) kuruyorsanız ve GPU hızlandırması istiyorsanız, sunucunuzda [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) kurulu olmalıdır. Kuruluysa, `docker-compose.prod.yml` içindeki `deploy` ayarları otomatik olarak GPU'yu kullanacaktır. Sunucuda başlatmak için:
```cmd
docker-compose -f docker-compose.prod.yml up -d --build
```

API şu adreste çalışacaktır: `http://localhost:8000`
Bağlantının sağlıklı olduğunu doğrulamak için `http://localhost:8000/api/decks/` adresini tarayıcınızda açıp test edebilirsiniz.

### Adım 2: Ön Yüzü (Frontend) Başlatma
React Native (Expo) uygulamasını başlatmak için:

1. `frontend` klasörüne girin:
```cmd
cd frontend
```
2. Gerekli kütüphaneleri yükleyin:
```cmd
npm install
```
3. Uygulamayı başlatın:
```cmd
npm start
```

Karşınıza çıkacak olan QR kodu telefonunuzdaki **Expo Go** uygulaması ile (iOS için Kamera, Android için Expo Go app içinden) tarayarak uygulamayı canlı olarak kullanmaya başlayabilirsiniz. 
Eğer projenizi bir Android emülatöründe çalıştırmak istiyorsanız `a` tuşuna basmanız yeterlidir.

## Nasıl Kullanılır?
1. **Upload**: Uygulama açıldığında bir görsel seçin yükleyin. Uygulama size görsel üzerindeki metinleri çevrili ve tıklanabilir şeffaf renkli kutular olarak getirecektir.
2. **Çeviri ve Kayıt**: Kutucuklardan birine tıkladığınızda `llama3` arka planda o cümlenin/kelimenin anlamını ve Türkçesini üretecektir. Buradan cümlenizi desteğe ekleyebilirsiniz (Add to Deck).
3. **Quiz (Test)**: Ana menüden "My Decks" bölümüne geçiş yapıp "Start Quiz" ile SM-2 aralıklı tekrar algoritmasına dayalı kart ezberleme çalışmanıza başlayabilirsiniz.
