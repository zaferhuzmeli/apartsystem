# Maviasya — Apart Oda Takip Sistemi — Tasarım Dokümanı

**Uygulama adı / marka:** Maviasya (kullanıcıya görünen tüm başlıklar). Worker adı: `maviasya`. D1 db adı (teknik): `apart-oda`.

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
[Next.js API routes  @ Cloudflare Workers (OpenNext, sunucu tarafı)]
        │  D1 binding (getCloudflareContext().env.DB) — REST/token YOK
        ▼
[Cloudflare D1  (SQLite) — rooms tablosu]
```

### Teknoloji

- **Next.js (App Router) + TypeScript 7** (native compiler, GA 2026-07-08).
  - TS 7'yi engelleyen `vite-tsconfig-paths` test eklentisi kaldırılır;
    `@/*` alias'ı vitest'te elle tanımlanır.
- **Barındırma:** Cloudflare Workers, `@opennextjs/cloudflare` adaptörü ile
  (`npm run deploy` → `opennextjs-cloudflare build` + `wrangler deploy`).
- **Veritabanı:** Cloudflare D1.
- **D1 erişimi:** Doğrudan **D1 binding** — sunucu kodunda
  `getCloudflareContext().env.DB` üzerinden `prepare().bind().all()`.
  Cloudflare API token veya REST çağrısı YOKTUR. Yerel geliştirmede
  `initOpenNextCloudflareForDev()` bindingleri `next dev`'e bağlar; D1'in
  yerel (miniflare) kopyası kullanılır.
- **Tipler:** `wrangler types --env-interface CloudflareEnv` ile
  `worker-configuration.d.ts` üretilir (D1Database, APP_PIN tipli erişim).

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

- **Gizli anahtar yok (frontend):** PIN secret yalnızca **Cloudflare
  binding env**'inde (`getCloudflareContext().env.APP_PIN`) — `process.env`'de
  değil, tarayıcıda hiç değil. D1 için ayrı token yok (binding). Tarayıcıya
  hiçbir gizli değer düşmez.
- **PIN girişi:** Sayfa herkese açık olmasın diye basit bir PIN. Kullanıcı
  PIN'i girer → API route binding'deki `APP_PIN` ile doğrular →
  başarılıysa HttpOnly oturum çerezi verilir; sonraki isteklerde kontrol
  edilir.
- **Kaynak güvenliği:** production build minify edilir, **source map
  kapalı** (`productionBrowserSourceMaps: false`) — kaynak kod okunaklı
  biçimde açığa çıkmaz.
- **CORS:** Frontend kendi `/api` route'larını çağırdığı için cross-origin
  yok; harici erişime kapalı.

## 7. Ortam Değişkenleri / Bindingler

- **D1 binding** `DB` — `wrangler.jsonc`'te tanımlı (database_name +
  database_id). Token yok.
- **`APP_PIN`** — giriş PIN'i (secret). Yerelde `.dev.vars` dosyasında;
  production'da `wrangler secret put APP_PIN` (veya Cloudflare dashboard).
  Kodda `getCloudflareContext().env.APP_PIN` ile okunur.

## 8. Kapsam Dışı (YAGNI)

- Geçmiş konaklama / gelir raporu yok
- Oda ekleme-silme yok (15 sabit)
- Çoklu apart / çoklu kat yok
- Kullanıcı hesabı / rol yönetimi yok (tek ortak PIN yeterli)

## 9. Kurulum Adımları (özet)

Kullanıcının yapacakları (adım adım yönlendirilecek):

1. Cloudflare hesabı aç.
2. `wrangler d1 create apart-oda` → çıkan `database_id`'yi `wrangler.jsonc`'e yaz.
3. Şemayı uygula: `wrangler d1 execute apart-oda --remote --file=schema.sql`.
4. PIN secret'ını gir: `wrangler secret put APP_PIN`.
5. `npm run deploy` → Cloudflare Workers'a yayınla.

## 10. Başarı Kriteri

- 101–115 kartları görünüyor.
- Bir cihazda durum/fatura/fiyat değişince diğer cihazlarda ~5 sn içinde
  görünüyor.
- PIN olmadan veriye erişilemiyor.
- Production bundle'da source map ve gizli anahtar yok.
