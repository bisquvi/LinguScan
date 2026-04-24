# OCR & Translation Flashcard App

Bu proje; yüklenen görsellerin üzerindeki İngilizce metinleri tespit eden (EasyOCR), yerel çalışan Llama3 modeliyle çevirisini yapan (Ollama) ve bu kelimeleri Spaced Repetition (Aralıklı Tekrar) yöntemiyle öğrenmenizi sağlayan (SM-2) tam yığın (full-stack) bir uygulamadır.

## Klasör Yapısı
- `backend/`: FastAPI, PostgreSQL veritabanı bağlantısı, EasyOCR ve Ollama entegrasyonlarını içeren Python kodları.
- `frontend/`: React Native (Expo) tabanlı, interaktif OCR kutucuklarını ve kart çalışma (Quiz) ekranlarını barındıran mobil arayüz.
- `docker-compose.yml`: Veritabanı, Backend ve Ollama'yı tek komutla ayağa kaldıran yapılandırma.

## Kurulum ve Çalıştırma

### 1 önkoşul
- Bilgisayarınızda **Docker** ve **Docker Compose** kurulu olmalıdır.
- (Eğer kendi cihazınızda test edecekseniz) Frontend için bilgisayarınızda **Node.js** (v18+) kurulu olmalıdır.

### Adım 1: Arka Ucu (Backend) Ayağa Kaldırma
Proje dizininde (bu dosyanın olduğu dizin) aşağıdaki komutu çalıştırarak arka uç, veritabanı ve Ollama'yı başlatın:

```cmd
docker-compose up -d --build
```

**Önemli Not (Ollama Llama 3 Modeli):**
Konternerlar ayağa kalktığında ilk başta Ollama `llama3` modeline sahip olmayabilir. İndirmek için otomatik çalışan servis (`ocr_ollama_pull`) devreye girecektir. Eğer hata alırsanız manuel indirmek için:
```cmd
docker exec -it ocr_ollama ollama run llama3
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
