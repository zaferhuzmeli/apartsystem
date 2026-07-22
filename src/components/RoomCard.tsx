"use client";

import type { Room } from "@/lib/rooms";

export function RoomCard({ room, onClick }: { room: Room; onClick: () => void }) {
  const rezerve = Boolean(room.rezervasyon_id);
  const dolu = room.durum === "dolu" || rezerve;
  return (
    <button className={`room-card ${dolu ? "is-dolu" : "is-bos"}`} onClick={onClick}>
      <div className="room-top">
        <span className="room-no">{room.oda_no}</span>
        <span className={`badge ${dolu ? "badge-dolu" : "badge-bos"}`}>
          {rezerve && room.rezervasyon_durumu !== "giris_yapti" ? "Rezerve" : dolu ? "Dolu" : "Boş"}
        </span>
      </div>
      <div className="room-price mono">{room.fiyat.toLocaleString("tr-TR")} ₺</div>
      {typeof room.dolu_gece === "number" && room.dolu_gece > 0 && (
        <div className="room-window">📅 7 günde {room.dolu_gece} gece dolu</div>
      )}
      {dolu && (
        <>
          {room.misafir_adi && <div className="room-guest">👤 {room.misafir_adi}</div>}
          {room.giris_tarihi && room.cikis_tarihi && <div className="room-dates">{room.giris_tarihi} → {room.cikis_tarihi}</div>}
          <div className={`room-fatura ${room.fatura_kesildi ? "ok" : "no"}`}>
            {room.fatura_kesildi ? "✓ Fatura kesildi" : "⚠ Fatura bekliyor"}
          </div>
        </>
      )}
    </button>
  );
}
