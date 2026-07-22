CREATE TABLE IF NOT EXISTS rooms (
  oda_no INTEGER PRIMARY KEY,
  durum TEXT NOT NULL DEFAULT 'bos' CHECK (durum IN ('bos', 'dolu')),
  fatura_kesildi INTEGER NOT NULL DEFAULT 0 CHECK (fatura_kesildi IN (0, 1)),
  fiyat REAL NOT NULL DEFAULT 0
);

-- 101–115 seed
INSERT OR IGNORE INTO rooms (oda_no) VALUES
  (101),(102),(103),(104),(105),(106),(107),(108),
  (109),(110),(111),(112),(113),(114),(115);

-- Otomatik tahsilat kayıtları (çıkışta oluşur: dolu → boş)
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oda_no INTEGER NOT NULL,
  tutar REAL NOT NULL,
  odeme_yontemi TEXT NOT NULL DEFAULT 'nakit' CHECK (odeme_yontemi IN ('nakit', 'havale')),
  tarih TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Müşteri bilgileri yalnızca yetkili oturum ile erişilen rezervasyon ekranında kullanılır.
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

-- İşlem geçmişi / aktivite log'u (her oda değişikliğinde satır eklenir)
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oda_no INTEGER NOT NULL,
  mesaj TEXT NOT NULL,
  tarih TEXT NOT NULL DEFAULT (datetime('now'))
);
