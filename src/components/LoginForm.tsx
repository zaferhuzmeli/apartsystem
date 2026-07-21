"use client";

import { useState } from "react";

const MAX = 8;

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!pin || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        setError("PIN hatalı");
        setPin("");
      }
    } catch {
      setError("Bağlantı hatası, tekrar deneyin");
    } finally {
      setLoading(false);
    }
  }

  const press = (d: string) => {
    setError("");
    setPin((p) => (p.length >= MAX ? p : p + d));
  };
  const back = () => {
    setError("");
    setPin((p) => p.slice(0, -1));
  };
  const clear = () => {
    setError("");
    setPin("");
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="mark">Maviasya</div>
          <div className="rule" />
          <div className="sub">Erdemli apart · oda takip</div>
        </div>

        <input
          id="pin"
          aria-label="PIN"
          className="login-display"
          type="password"
          inputMode="none"
          autoComplete="off"
          placeholder="••••"
          value={pin}
          onChange={(e) => {
            setError("");
            setPin(e.target.value.replace(/\D/g, "").slice(0, MAX));
          }}
        />

        <div className="keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button type="button" key={n} className="key" onClick={() => press(String(n))}>
              {n}
            </button>
          ))}
          <button type="button" className="key key-util" onClick={clear} aria-label="Temizle">
            C
          </button>
          <button type="button" className="key" onClick={() => press("0")}>
            0
          </button>
          <button type="button" className="key key-util" onClick={back} aria-label="Sil">
            ⌫
          </button>
        </div>

        <button className="login-btn" type="submit" disabled={loading || !pin}>
          {loading ? "..." : "Giriş"}
        </button>
        {error && <p className="login-error">{error}</p>}
      </form>
    </div>
  );
}
