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

  async function save() {
    setSaving(true);
    await onSave({ durum, fatura_kesildi: fatura, fiyat: Number(fiyat) || 0 });
    setSaving(false);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 340, display: "grid", gap: 14 }}
      >
        <h2 style={{ fontSize: 18 }}>Oda {room.oda_no}</h2>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setDurum("bos")} style={pill(durum === "bos", "#16a34a")}>Boş</button>
          <button onClick={() => setDurum("dolu")} style={pill(durum === "dolu", "#dc2626")}>Dolu</button>
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={fatura === 1} onChange={(e) => setFatura(e.target.checked ? 1 : 0)} />
          Fatura kesildi
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          Fiyat (TL)
          <input
            type="number"
            min={0}
            value={fiyat}
            onChange={(e) => setFiyat(e.target.value)}
            style={{ padding: 10, fontSize: 16, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </label>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc", background: "#fff" }}>
            İptal
          </button>
          <button onClick={save} disabled={saving} style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff" }}>
            {saving ? "..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function pill(active: boolean, color: string): React.CSSProperties {
  return {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    border: `2px solid ${color}`,
    background: active ? color : "#fff",
    color: active ? "#fff" : color,
    fontWeight: 600,
    cursor: "pointer",
  };
}
