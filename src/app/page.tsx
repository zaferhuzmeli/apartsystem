"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Room, RoomPatch } from "@/lib/rooms";
import { LoginForm } from "@/components/LoginForm";
import { RoomCard } from "@/components/RoomCard";
import { RoomEditor } from "@/components/RoomEditor";
import { AppShell } from "@/components/AppShell";
import { Sidebar, type RoomFilter } from "@/components/Sidebar";
import { todayIstanbul } from "@/lib/calendar";

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<Room | null>(null);
  const [filter, setFilter] = useState<RoomFilter>("tumu");
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [tarih, setTarih] = useState(() => todayIstanbul());

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms?tarih=${tarih}`);
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      const json = (await res.json()) as { rooms: Room[] };
      setRooms(json.rooms ?? []);
      setAuthed(true);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [tarih]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000); // 5 sn polling
    return () => clearInterval(id);
  }, [load]);

  async function logout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // yine de yerel oturumu kapat
    }
    setRooms([]);
    setAuthed(false);
  }

  async function saveRoom(oda_no: number, patch: RoomPatch) {
    try {
      const res = await fetch(`/api/rooms/${oda_no}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setSaveError(!res.ok);
      await load();
    } catch {
      setSaveError(true);
    }
  }

  const visible = useMemo(
    () =>
      rooms.filter((r) => {
        const dolu = r.durum === "dolu" || Boolean(r.rezervasyon_id);
        if (filter === "bos") return !dolu;
        if (filter === "dolu") return dolu;
        if (filter === "faturasiz") return dolu && !r.fatura_kesildi;
        return true;
      }),
    [rooms, filter],
  );

  if (authed === null) {
    return (
      <div className="center-state">
        {loadError ? (
          <>
            <p className="err">Bağlantı kurulamadı.</p>
            <button className="btn btn-primary" onClick={() => load()}>
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

  const filterLabel: Record<RoomFilter, string> = {
    tumu: "Tüm odalar",
    bos: "Boş odalar",
    dolu: "Dolu odalar",
    faturasiz: "Fatura bekleyen odalar",
  };

  return (
    <>
      <AppShell
        sidebar={(close) => (
          <Sidebar
            rooms={rooms}
            filter={filter}
            onFilter={(f) => {
              setFilter(f);
              close();
            }}
            onSelectRoom={(r) => {
              setSelected(r);
              close();
            }}
            onLogout={logout}
          />
        )}
      >
        <div className="main-head">
          <div><h1>{filterLabel[filter]}</h1><span className="sub mono">{visible.length} oda</span></div>
          <label className="room-date-picker">Tarih<input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} /></label>
        </div>

        {loadError && (
          <div className="banner banner-warn">
            Bağlantı hatası — son bilinen durum gösteriliyor.
          </div>
        )}
        {saveError && (
          <div className="banner banner-warn">Kaydedilemedi, tekrar deneyin.</div>
        )}

        <div className="room-grid">
          {visible.length === 0 ? (
            <p className="grid-empty">Bu filtreye uygun oda yok.</p>
          ) : (
            visible.map((room) => (
              <RoomCard key={room.oda_no} room={room} onClick={() => setSelected(room)} />
            ))
          )}
        </div>
      </AppShell>

      {selected && (
        <RoomEditor
          room={selected}
          onClose={() => setSelected(null)}
          onSave={(patch) => saveRoom(selected.oda_no, patch)}
        />
      )}
    </>
  );
}
