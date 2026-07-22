"use client";

import type { Room } from "@/lib/rooms";

const kisa = (d?: string | null) => (d ? `${d.slice(8)}.${d.slice(5, 7)}` : "");

export function RoomCard({ room, onClick }: { room: Room; onClick: () => void }) {
  const rezerve = Boolean(room.rezervasyon_id);
  const dolu = room.durum === "dolu" || rezerve;
  const sonraki = room.sonraki_misafir
    ? { ad: room.sonraki_misafir, giris: room.sonraki_giris, cikis: room.sonraki_cikis, fiyat: room.sonraki_fiyat, tel: room.sonraki_telefon }
    : null;
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
      {/* Seçili gün boşken bile yaklaşan rezervasyonu göster */}
      {!dolu && sonraki && (
        <div className="room-next">📌 Sonraki: {sonraki.ad} · {kisa(sonraki.giris)}–{kisa(sonraki.cikis)}</div>
      )}
      {/* Hover detay balonu */}
      {sonraki && (
        <div className="room-tip" role="tooltip">
          <strong>{sonraki.ad}</strong>
          <span>{kisa(sonraki.giris)} → {kisa(sonraki.cikis)}</span>
          {typeof sonraki.fiyat === "number" && <span>{sonraki.fiyat.toLocaleString("tr-TR")} ₺/gece</span>}
          {sonraki.tel && <span>☎ {sonraki.tel}</span>}
        </div>
      )}
    </button>
  );
}
