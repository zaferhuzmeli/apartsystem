# Maviasya

Erdemli apartının 101–115 odalarını (durum, fatura, fiyat) takip eden
Next.js uygulaması. `@opennextjs/cloudflare` ile Cloudflare Workers'ta
çalışır, verisi Cloudflare D1'de durur.

## Yerel geliştirme

```bash
pnpm install
cp .dev.vars.example .dev.vars          # APP_PIN + SESSION_SECRET'i ayarla
pnpm exec wrangler d1 execute apartsystem --local --file=schema.sql   # yerel D1'e şema
pnpm dev            # http://localhost:7888
```

## Rezervasyon ve ödeme güncellemesi

Yeni kurulumlarda `schema.sql` rezervasyon ve ödeme alanlarını zaten oluşturur.
Mevcut bir D1 veritabanını güncellemek için, bir kez aşağıdaki migration'ı uygula:

```bash
pnpm exec wrangler d1 execute apartsystem --local --file=migrations/0001_reservations.sql
pnpm exec wrangler d1 execute apartsystem --remote --file=migrations/0001_reservations.sql
```

`/rezervasyonlar` ekranından müşteri ve tarih girilerek rezervasyon açılır.
Aynı odaya tarihleri kesişen ikinci bir rezervasyon kaydedilemez; çıkış günü
aynı gün yeni giriş için kullanılabilir. "Giriş yapıldı" seçildiğinde müşteri
oda kartında görünür. Çıkışta nakit veya havale/EFT seçilir ve tahsilat geçmişine
ödeme yöntemiyle birlikte eklenir.

## Cloudflare kurulumu

1. Cloudflare hesabı aç (ücretsiz).
2. D1 veritabanı (adı `apartsystem`) — yoksa oluştur:
   ```bash
   pnpm exec wrangler d1 create apartsystem
   ```
   Çıktıdaki (veya dashboard → D1 → Settings'teki) `database_id`'yi
   `wrangler.jsonc` → `d1_databases[0].database_id` alanına yaz.
3. Şemayı uzak D1'e uygula:
   ```bash
   pnpm exec wrangler d1 execute apartsystem --remote --file=schema.sql
   ```
4. Secret'ları gir:
   ```bash
   pnpm exec wrangler secret put APP_PIN
   pnpm exec wrangler secret put SESSION_SECRET   # uzun rastgele: openssl rand -hex 32
   ```

## Deploy

```bash
pnpm deploy        # opennextjs-cloudflare build && wrangler deploy
```
Verilen `*.workers.dev` URL'ini telefonda/bilgisayarda aç, PIN ile gir.

## Bindingler / secret'lar

| Ad              | Tür         | Nerede                                          |
|-----------------|-------------|-------------------------------------------------|
| `DB`            | D1 binding  | `wrangler.jsonc` (`database_name: apartsystem`) |
| `APP_PIN`       | secret      | yerelde `.dev.vars`, prod'da `wrangler secret`  |
| `SESSION_SECRET`| secret      | yerelde `.dev.vars`, prod'da `wrangler secret`  |

Kodda üçü de `getCloudflareContext().env` üzerinden okunur (bkz. `src/lib/env.ts`).

## Güvenlik notları

- D1'e binding ile erişilir; REST API / API token YOK.
- `APP_PIN` ve `SESSION_SECRET` yalnızca sunucu-taraflı binding env'inde; tarayıcıya düşmez.
- Oturum token'ı PIN'den türetilmez (SESSION_SECRET ile imzalanır) + 30 gün expiry → sızan çerezden PIN çıkmaz, süresiz replay olmaz.
- Production build'de source map kapalı.
- PIN'i değiştirmek için `wrangler secret put APP_PIN` ile güncelle.
