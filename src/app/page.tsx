"use client";

import { useCallback, useEffect, useState } from "react";
import type { Room, RoomPatch } from "@/lib/rooms";
import { LoginForm } from "@/components/LoginForm";
import { RoomCard } from "@/components/RoomCard";
import { RoomEditor } from "@/components/RoomEditor";

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<Room | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const json = (await res.json()) as { rooms: Room[] };
      setRooms(json.rooms);
      setAuthed(true);
      setLoadError(false);
    } catch {
      // Ağ hatası: önceki oda listesini koru, sadece küçük bir uyarı göster
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000); // 5 sn polling
    return () => clearInterval(id);
  }, [load]);

  async function saveRoom(oda_no: number, patch: RoomPatch) {
    try {
      const res = await fetch(`/api/rooms/${oda_no}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      // Ağ hatası değil ama sunucu reddettiyse (400/401) de sessizce başarı sayma
      setSaveError(!res.ok);
      await load();
    } catch {
      // Kayıt sırasında bağlantı hatası: kullanıcıyı bilgilendir, arayüzü kilitleme
      setSaveError(true);
    }
  }

  if (authed === null) {
    return (
      <div style={{ textAlign: "center", marginTop: 80 }}>
        {loadError ? (
          <>
            <p style={{ color: "#dc2626", marginBottom: 12 }}>Bağlantı hatası.</p>
            <button
              onClick={() => load()}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff" }}
            >
              Tekrar dene
            </button>
          </>
        ) : (
          <p>Yükleniyor…</p>
        )}
      </div>
    );
  }
  if (!authed) return <LoginForm onSuccess={load} />;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, margin: "8px 0 16px" }}>Maviasya</h1>
      {loadError && (
        <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>
          Bağlantı hatası, son bilinen durum gösteriliyor.
        </p>
      )}
      {saveError && (
        <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>
          Kaydedilemedi, tekrar deneyin.
        </p>
      )}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        }}
      >
        {rooms.map((room) => (
          <RoomCard key={room.oda_no} room={room} onClick={() => setSelected(room)} />
        ))}
      </div>
      {selected && (
        <RoomEditor
          room={selected}
          onClose={() => setSelected(null)}
          onSave={(patch) => saveRoom(selected.oda_no, patch)}
        />
      )}
    </main>
  );
}
