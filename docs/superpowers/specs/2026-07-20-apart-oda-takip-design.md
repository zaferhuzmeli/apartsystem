# Apart Oda Takip Sistemi — Tasarım Dokümanı

**Tarih:** 2026-07-20
**Konum/İşletme:** Erdemli apart (101–115 odalar)

## 1. Amaç

Erdemli'deki apartın 15 odasını (101–115) basit ve pratik biçimde takip
etmek. Her oda için yalnızca 4 bilgi tutulur:

1. **Oda no** — 101 … 115
2. **Durum** — boş / dolu (giriş-çıkış)
3. **Fatura** — kesildi mi? (evet / hayır)
4. **Fiyat** — o odanın güncel fiyatı

Geçmiş konaklama kaydı **tutulmaz** — sadece anlık (güncel) durum. Sistem
birden çok kişi tarafından, farklı cihazlardan (telefon + bilgisayar) aynı
güncel veriyle kullanılır.

## 2. Mimari

Tek bir **Next.js** projesi; frontend + API aynı repoda. Veritabanı
Cloudflare D1.

```
[Tarayıcı: Next.js sayfası]
        │  (kendi /api route'ları — CORS yok)
        ▼
[Next.js API routes  @ Vercel (sunucu tarafı)]
        │  Cloudflare D1 REST API (API token env'de)
        ▼
[Cloudflare D1  (SQLite) — rooms tablosu]
```

### Teknoloji

- **Next.js (App Router) + TypeScript 7**
  - TS 7 (native compiler) kullanılır; kurulum anında mevcut değilse en
    güncel TypeScript 5.x'e düşülür (kararı implementasyonda net veririz).
- **Barındırma:** Vercel (GitHub'a bağlanınca otomatik deploy)
- **Veritabanı:** Cloudflare D1
- **D1 erişimi:** Next.js API route'larından Cloudflare **D1 REST API**
  (`/accounts/{account_id}/d1/database/{database_id}/query`) ile. Ayrı bir
  Cloudflare Worker deploy edilmez.
  - *Yedek plan:* D1 REST API bir engel çıkarırsa, D1'in önüne küçük bir
    Cloudflare Worker konur ve Next.js o Worker'ı çağırır. Sözleşme
    (endpoint'ler) aynı kalır, yalnızca arka uç değişir.

## 3. Veri Modeli

Tek tablo: `rooms`

| Sütun            | Tip     | Açıklama                          |
|------------------|---------|-----------------------------------|
| `oda_no`         | INTEGER | Birincil anahtar (101–115)        |
| `durum`          | TEXT    | `bos` \| `dolu`                    |
| `fatura_kesildi` | INTEGER | 0 = hayır, 1 = evet               |
| `fiyat`          | REAL    | Güncel fiyat (TL)                 |

Başlangıçta 101–115 arası 15 satır seed edilir (durum=`bos`,
fatura=0, fiyat=0).

## 4. API Sözleşmesi

Hepsi Next.js API route'u; PIN doğrulaması zorunlu (bkz. Güvenlik).

- `GET  /api/rooms` → tüm odaların güncel listesi
- `PATCH /api/rooms/:oda_no` → bir odanın `durum` / `fatura_kesildi` /
  `fiyat` alanlarından gönderilenleri günceller

Yalnızca bu iki uç yeterli (oda ekleme/silme yok; 15 oda sabit).

## 5. Arayüz (UI)

- **Ana ekran:** 101–115 için 15 oda kartı.
  - Telefonda: alt alta / 2'li ızgara. Bilgisayarda: çok sütunlu ızgara.
  - Her kart: **oda no** + durum rozeti (🟢 Boş / 🔴 Dolu) +
    fatura işareti (✓ Kesildi / ✗ Kesilmedi) + **fiyat**.
- **Düzenleme:** karta dokun → küçük bir panel/az alan:
  - Durum değiştir (boş ↔ dolu)
  - Fatura işaretle/kaldır
  - Fiyat gir
  - Kaydet → `PATCH` çağrısı.
- **Canlı senkron:** sayfa her ~5 sn'de bir `GET /api/rooms` ile
  yenilenir (polling). Küçük ölçek için "canlı" hissi verir.

## 6. Güvenlik

- **Gizli anahtar yok (frontend):** Cloudflare API token ve PIN secret
  yalnızca **Vercel sunucu-taraflı env** değişkenlerinde. Tarayıcıya
  hiçbir gizli değer düşmez.
- **PIN girişi:** Sayfa herkese açık olmasın diye basit bir PIN. Kullanıcı
  PIN'i girer → API route Vercel env'indeki `APP_PIN` ile doğrular →
  başarılıysa bir oturum çerezi/token verilir; sonraki isteklerde kontrol
  edilir.
- **Kaynak güvenliği:** production build minify edilir, **source map
  kapalı** (`productionBrowserSourceMaps: false`) — kaynak kod okunaklı
  biçimde açığa çıkmaz.
- **CORS:** Frontend kendi `/api` route'larını çağırdığı için cross-origin
  yok; harici erişime kapalı.

## 7. Ortam Değişkenleri (env)

Vercel'de (sunucu tarafı, gizli):

- `CF_ACCOUNT_ID` — Cloudflare hesap ID
- `CF_D1_DATABASE_ID` — D1 veritabanı ID
- `CF_API_TOKEN` — D1'e erişim için Cloudflare API token (dar yetkili)
- `APP_PIN` — giriş PIN'i

## 8. Kapsam Dışı (YAGNI)

- Geçmiş konaklama / gelir raporu yok
- Oda ekleme-silme yok (15 sabit)
- Çoklu apart / çoklu kat yok
- Kullanıcı hesabı / rol yönetimi yok (tek ortak PIN yeterli)

## 9. Kurulum Adımları (özet)

Kullanıcının yapacakları (adım adım yönlendirilecek):

1. Cloudflare hesabı + D1 veritabanı oluştur, dar yetkili API token al.
2. Vercel hesabı + GitHub bağlantısı.
3. Env değişkenlerini Vercel'e gir.
4. Deploy.

## 10. Başarı Kriteri

- 101–115 kartları görünüyor.
- Bir cihazda durum/fatura/fiyat değişince diğer cihazlarda ~5 sn içinde
  görünüyor.
- PIN olmadan veriye erişilemiyor.
- Production bundle'da source map ve gizli anahtar yok.
