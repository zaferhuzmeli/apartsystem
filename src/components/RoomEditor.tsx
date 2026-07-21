"use client";

import { useState } from "react";
import type { Room, RoomPatch } from "@/lib/rooms";

export function RoomEditor({
  room,
  onClose,
  onSave,
}: {
  room: Room;
  onClose: () => void;
  onSave: (patch: RoomPatch) => Promise<void>;
}) {
  const [durum, setDurum] = useState(room.durum);
  const [fatura, setFatura] = useState<0 | 1>(room.fatura_kesildi);
  const [fiyat, setFiyat] = useState(String(room.fiyat));
  const [saving, setSaving] = useState(false);

  const willCheckout = room.durum === "dolu" && durum === "bos";

  async function save() {
    setSaving(true);
    await onSave({ durum, fatura_kesildi: fatura, fiyat: Number(fiyat) || 0 });
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>
          Oda <span className="mono">{room.oda_no}</span>
        </h2>

        <div className="seg">
          <button
            className={`seg-btn ${durum === "bos" ? "on-bos" : ""}`}
            onClick={() => setDurum("bos")}
          >
            Boş
          </button>
          <button
            className={`seg-btn ${durum === "dolu" ? "on-dolu" : ""}`}
            onClick={() => setDurum("dolu")}
          >
            Dolu
          </button>
        </div>

        {willCheckout && (
          <div className="banner banner-warn">
            Çıkış: {(Number(fiyat) || 0).toLocaleString("tr-TR")} ₺ tahsilata eklenecek.
          </div>
        )}

        <label className="check">
          <input
            type="checkbox"
            checked={fatura === 1}
            onChange={(e) => setFatura(e.target.checked ? 1 : 0)}
          />
          Fatura kesildi
        </label>

        <label className="field">
          Fiyat (₺)
          <input
            type="number"
            min={0}
            value={fiyat}
            onChange={(e) => setFiyat(e.target.value)}
          />
        </label>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            İptal
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
