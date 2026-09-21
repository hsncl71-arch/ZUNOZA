# ZUNOZA AI VIDEO

Türkçe AI üretim stüdyosu: metinden video, görsel, seslendirme, müzik, montaj,
storyboard, asistan, kredi/paket ve native (iOS/Android) kabuk.

> Bu depo, 21 Eylül 2026 tarihinde mevcut ZUNOZA kaynağının **secrets’sız**
> yedeğidir. Canlı API anahtarları, R2, iyzico ve Apple private key bu repoda
> yoktur.

## Ürün yüzeyleri

- Video stüdyosu (`/olustur`) — Grok Imagine, 5/10/15/30 sn
- Görsel stüdyo (`/gorsel`)
- Seslendirme / TTS (`/seslendirme`)
- Müzik (`/muzik`)
- Montaj (`/montaj`)
- Storyboard (`/storyboard`)
- Videolarım, Projeler, Asistan, İnşa Et, Dizi, Anılar, Sosyal
- Paketler / krediler, iyzico iskeleti, yönetici paneli
- KVKK ve yasal sayfalar
- Capacitor native kabuk (`android/`, `ios/`, `native/`)

## Güvenlik

1. `.env` dosyası commit edilmez.
2. Gizli değerler yalnızca host secret store / platform env içindedir.
3. Değişken adları için `.env.example` dosyasına bakın.
4. Bazı büyük dosyalar paylaşım API sınırından dolayı eksik olabilir — `SOURCE_STATUS.md`.

## Çalıştırma

Bu yedek bir Grok App Builder / TanStack Start projesidir. Bağımlılıklar
`package.json` içindedir. Gerçek üretim için R2, xAI, iyzico ve auth
secret’larını ortam değişkeni olarak verin; asla kaynak koda yazmayın.
