# Uzpos Güncelleme Kılavuzu

Uygulamayı güncellerken verilerinizin (stoklar, masalar, satışlar) kaybolmaması için bu adımları izleyin.

## 1. Veritabanını Yedekleyin
Herhangi bir işlem yapmadan önce mevcut verilerinizi yedeklemek en güvenli yoldur.
- `scripts/backup.ps1` dosyasına sağ tıklayıp "PowerShell ile çalıştır" deyin.
- Bu işlem `backups/` klasörü içinde tarihli bir yedek oluşturur.

## 2. Güncelleme Kodlarını Alın
Eğer Git kullanıyorsanız:
```powershell
git pull
```

## 3. Bağımlılıkları Güncelleyin
Yeni paketler eklenmiş olabilir:
```powershell
npm install
```

## 4. Veritabanı Yapısını Güncelleyin
Veritabanı tablolarında bir değişiklik varsa şu komutu çalıştırın (bu komut verilerinizi silmez, sadece yeni özellikleri ekler):
```powershell
npx prisma migrate deploy
```

## 5. Uygulamayı Yeniden Derleyin
```powershell
npm run build
```

## 6. Başlatın
```powershell
npm run start
```

---

### Dikkat Edilmesi Gereken Dosyalar
Şu dosya ve klasörleri kesinlikle silmeyin veya üzerine yazmayın:
- `prisma/dev.db` (Tüm verileriniz buradadır)
- `.env` (Bağlantı ayarlarınız buradadır)
- `public/uploads/` (Eğer ürün fotoğrafları yüklüyse buradadır)
