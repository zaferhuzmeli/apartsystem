"use client";

import { useState } from "react";

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setLoading(false);
    if (res.ok) {
      onSuccess();
    } else {
      setError("PIN hatalı");
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 280, margin: "80px auto", display: "grid", gap: 12 }}>
      <h1 style={{ fontSize: 20 }}>Maviasya</h1>
      <label htmlFor="pin">PIN</label>
      <input
        id="pin"
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        style={{ padding: 10, fontSize: 16, borderRadius: 8, border: "1px solid #ccc" }}
      />
      <button
        type="submit"
        disabled={loading}
        style={{ padding: 10, fontSize: 16, borderRadius: 8, border: "none", background: "#2563eb", color: "#fff" }}
      >
        {loading ? "..." : "Giriş"}
      </button>
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
    </form>
  );
}
