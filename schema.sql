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
  tarih TEXT NOT NULL DEFAULT (datetime('now'))
);

-- İşlem geçmişi / aktivite log'u (her oda değişikliğinde satır eklenir)
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oda_no INTEGER NOT NULL,
  mesaj TEXT NOT NULL,
  tarih TEXT NOT NULL DEFAULT (datetime('now'))
);
