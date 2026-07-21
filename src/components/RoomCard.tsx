"use client";

import type { Room } from "@/lib/rooms";

export function RoomCard({ room, onClick }: { room: Room; onClick: () => void }) {
  const dolu = room.durum === "dolu";
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        border: "none",
        borderRadius: 12,
        padding: 14,
        cursor: "pointer",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        borderTop: `4px solid ${dolu ? "#dc2626" : "#16a34a"}`,
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 22, fontWeight: 700 }}>{room.oda_no}</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 999,
            color: "#fff",
            background: dolu ? "#dc2626" : "#16a34a",
          }}
        >
          {dolu ? "Dolu" : "Boş"}
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{room.fiyat} TL</div>
      <div style={{ fontSize: 13, color: room.fatura_kesildi ? "#16a34a" : "#9ca3af" }}>
        {room.fatura_kesildi ? "✓ Fatura kesildi" : "✗ Fatura kesilmedi"}
      </div>
    </button>
  );
}
