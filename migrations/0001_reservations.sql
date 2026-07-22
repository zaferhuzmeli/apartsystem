-- Mevcut D1 veritabanlarına bir kez uygula:
-- pnpm exec wrangler d1 execute apartsystem --local --file=migrations/0001_reservations.sql
-- pnpm exec wrangler d1 execute apartsystem --remote --file=migrations/0001_reservations.sql

ALTER TABLE collections ADD COLUMN odeme_yontemi TEXT NOT NULL DEFAULT 'nakit'
  CHECK (odeme_yontemi IN ('nakit', 'havale'));

CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ad TEXT NOT NULL,
  soyad TEXT NOT NULL,
  telefon TEXT,
  plaka TEXT,
  tc_kimlik TEXT
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL REFERENCES guests(id),
  oda_no INTEGER NOT NULL REFERENCES rooms(oda_no),
  giris_tarihi TEXT NOT NULL,
  cikis_tarihi TEXT NOT NULL,
  gunluk_fiyat REAL NOT NULL DEFAULT 0,
  durum TEXT NOT NULL DEFAULT 'onaylandi'
    CHECK (durum IN ('on_rezervasyon', 'onaylandi', 'giris_yapti', 'cikti', 'iptal')),
  notlar TEXT,
  olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (date(cikis_tarihi) > date(giris_tarihi))
);

CREATE INDEX IF NOT EXISTS reservations_room_dates_idx
  ON reservations (oda_no, giris_tarihi, cikis_tarihi);
