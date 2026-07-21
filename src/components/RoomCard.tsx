"use client";

import type { Room } from "@/lib/rooms";

export function RoomCard({ room, onClick }: { room: Room; onClick: () => void }) {
  const dolu = room.durum === "dolu";
  return (
    <button className={`room-card ${dolu ? "is-dolu" : "is-bos"}`} onClick={onClick}>
      <div className="room-top">
        <span className="room-no">{room.oda_no}</span>
        <span className={`badge ${dolu ? "badge-dolu" : "badge-bos"}`}>
          {dolu ? "Dolu" : "Boş"}
        </span>
      </div>
      <div className="room-price mono">{room.fiyat.toLocaleString("tr-TR")} ₺</div>
      {dolu && (
        <div className={`room-fatura ${room.fatura_kesildi ? "ok" : "no"}`}>
          {room.fatura_kesildi ? "✓ Fatura kesildi" : "⚠ Fatura bekliyor"}
        </div>
      )}
    </button>
  );
}
