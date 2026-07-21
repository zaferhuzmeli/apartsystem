# Maviasya Sistemi — İmplementasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Erdemli apartının 101–115 odalarını (durum, fatura, fiyat) telefon + bilgisayardan ortak takip eden basit bir web uygulaması yapmak.

**Architecture:** Tek bir Next.js (App Router) projesi, `@opennextjs/cloudflare` ile Cloudflare Workers'ta çalışır. Frontend + API aynı repoda; API route'ları sunucu tarafında D1'e **doğrudan binding** (`getCloudflareContext().env.DB`) ile bağlanır — REST/token yok. Frontend kendi `/api` route'larını çağırır (CORS yok, gizli anahtar tarayıcıya düşmez). Basit PIN + HttpOnly çerez ile giriş. `wrangler` ile Cloudflare'e deploy edilir.

**Tech Stack:** Next.js (App Router), React, TypeScript 6, `@opennextjs/cloudflare`, Cloudflare Workers + D1 (binding), Vitest + Testing Library, wrangler.

## Global Constraints

- **TypeScript 6** (klasik derleyici, en güncel 6.x). TS7 (native/Go) şu an Next build'iyle **çalışmıyor** — klasik Compiler API'sini (`typescript/lib/typescript.js`) içermiyor, Next build onu zorunlu istiyor; stabil programatik API 7.1'e (~Ekim 2026) kadar yok. TS7'ye 7.1 çıkınca yükseltilecek. TS6 Next ile çalışmazsa 5.9.3'e düş. `tsconfig` her zaman `"strict": true`; `vite-tsconfig-paths` kaldırılır, `@/*` alias'ı vitest'te `resolve.alias` ile verilir.
- **Node:** 20+.
- **Paket yöneticisi:** **pnpm** (tüm komutlar pnpm ile). Task 1 npm ile kuruldu; Task 1B `package-lock.json`'ı silip `pnpm install` ile `pnpm-lock.yaml`'a geçer. Kurulum: `pnpm add -D <pkg>`; script: `pnpm <script>`; bin: `pnpm exec <bin>`.
- **Source map:** production'da kapalı — `next.config.ts` içinde `productionBrowserSourceMaps: false`.
- **D1 erişimi:** yalnızca Cloudflare D1 **binding** (`getCloudflareContext().env.DB`). REST API / API token YOK.
- **Secret'lar:** `APP_PIN` yalnızca Cloudflare binding env'inde (`getCloudflareContext().env.APP_PIN`) — `process.env`'de değil, tarayıcıda değil. Yerelde `.dev.vars`, production'da `wrangler secret`. `NEXT_PUBLIC_*` değişkeni yoktur.
- **Odalar:** 101–115 sabit; oda ekleme/silme yok.
- **Kullanıcıya görünen tüm metinler Türkçe.**
- Her task sonunda **commit**.

> **NOT (2026-07-20 revizyonu):** Task 1 önce Vercel + D1 REST + TS 5.9.3 varsayımıyla tamamlandı (commit `26fa611`). Task 1B bu iskeleti Cloudflare/OpenNext + TS7 + D1 binding'e taşır. Task 2 ve sonrası bu revize mimariyi izler.

---

## Dosya Yapısı

```
apartsystem/
├── package.json
├── tsconfig.json
├── next.config.ts               # sourcemap kapalı + initOpenNextCloudflareForDev()
├── open-next.config.ts          # OpenNext adaptör config
├── wrangler.jsonc               # Worker + D1 binding (DB) + compat flags
├── worker-configuration.d.ts    # `wrangler types` çıktısı (CloudflareEnv)
├── vitest.config.ts
├── vitest.setup.ts              # test env + jest-dom
├── .dev.vars.example            # yerel secret örneği (APP_PIN)
├── schema.sql                   # D1 tablo + seed
├── README.md                    # kurulum adımları
└── src/
    ├── lib/
    │   ├── env.ts               # getEnv(): binding env (DB, APP_PIN)
    │   ├── d1.ts                # D1 binding istemcisi: d1Query()
    │   ├── rooms.ts             # Room tipi, validateRoomPatch, getAllRooms, updateRoom
    │   └── auth.ts              # PIN doğrulama + oturum token'ı
    ├── components/
    │   ├── LoginForm.tsx        # PIN girişi
    │   ├── RoomCard.tsx         # tek oda kartı
    │   └── RoomEditor.tsx       # düzenleme paneli (modal)
    └── app/
        ├── layout.tsx
        ├── globals.css
        ├── page.tsx             # ana ekran: gate + grid + polling
        └── api/
            ├── login/route.ts   # POST: PIN -> çerez
            └── rooms/
                ├── route.ts             # GET: tüm odalar
                └── [oda_no]/route.ts    # PATCH: bir oda
```

---

## Task 1: Proje iskeleti + config + smoke test

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/lib/health.ts`
- Test: `src/lib/health.test.ts`

**Interfaces:**
- Consumes: (yok)
- Produces: `@/*` import alias `src/`'e işaret eder; `pnpm test` (vitest) ve `pnpm dev` çalışır.

- [ ] **Step 1: package.json oluştur**

```json
{
  "name": "apartsystem",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "vitest": "latest",
    "jsdom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/user-event": "latest",
    "vite-tsconfig-paths": "latest"
  }
}
```

- [ ] **Step 2: tsconfig.json oluştur**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: next.config.ts (source map kapalı)**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
};

export default nextConfig;
```

- [ ] **Step 4: vitest.config.ts ve vitest.setup.ts**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

`vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";

// Testler için varsayılan env (tekil testler override edebilir)
process.env.CF_ACCOUNT_ID ||= "test-account";
process.env.CF_D1_DATABASE_ID ||= "test-db";
process.env.CF_API_TOKEN ||= "test-token";
process.env.APP_PIN ||= "1234";
```

- [ ] **Step 5: .gitignore**

```
node_modules
.next
.env.local
*.log
.DS_Store
coverage
```

- [ ] **Step 6: Uygulama iskeleti (layout, page, css)**

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maviasya",
  description: "Erdemli apart oda takip sistemi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/globals.css`:
```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #f4f5f7;
  color: #1a1a1a;
  padding: 16px;
}
```

`src/app/page.tsx` (geçici):
```tsx
export default function Home() {
  return <h1>Maviasya</h1>;
}
```

- [ ] **Step 7: Smoke test için health modülü**

`src/lib/health.ts`:
```ts
export const APP_NAME = "Maviasya";
```

`src/lib/health.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { APP_NAME } from "@/lib/health";

describe("health", () => {
  it("uygulama adını export eder", () => {
    expect(APP_NAME).toBe("Maviasya");
  });
});
```

- [ ] **Step 8: Bağımlılıkları kur ve testi çalıştır (FAIL beklenmez, geçmeli)**

Run:
```bash
pnpm install
pnpm test
```
Expected: `health.test.ts` PASS. (Kurulumda TS 7 stabil değilse `pnpm install typescript@latest` ile 5.x'e düşülür — Global Constraints.)

- [ ] **Step 9: Dev sunucusu ile manuel doğrula**

Run: `pnpm dev` → tarayıcıda `http://localhost:3000` → "Maviasya" başlığı görünür. Ctrl+C ile kapat.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TS + vitest project"
```

---

## Task 1B: Cloudflare (OpenNext) + TS7 geçişi

Task 1 iskeleti Vercel + TS 5.9.3 varsayımıyla kuruldu. Bu task onu Cloudflare Workers (`@opennextjs/cloudflare`) + TS7 + D1 binding altyapısına taşır. Uygulama mantığı yok; yalnızca araç/altyapı.

**Files:**
- Modify: `package.json` (scriptler + bağımlılıklar), `next.config.ts`, `vitest.config.ts`, `.gitignore`
- Create: `open-next.config.ts`, `wrangler.jsonc`, `.dev.vars.example`, `.dev.vars` (gitignored), `worker-configuration.d.ts` (üretilir), `pnpm-lock.yaml`
- Remove: `vite-tsconfig-paths` (dep), `package-lock.json` (npm → pnpm geçişi)

**Interfaces:**
- Consumes: (Task 1 iskeleti)
- Produces: `getCloudflareContext()` sunucu kodunda kullanılabilir; `@/*` alias'ı vitest'te `resolve.alias` ile çalışır; `pnpm deploy` / `pnpm preview` / `pnpm cf-typegen` scriptleri.

- [ ] **Step 1: npm → pnpm geçişi + bağımlılıklar**

Run:
```bash
rm -f package-lock.json
pnpm import 2>/dev/null || true   # varsa package-lock'tan pnpm-lock üret (opsiyonel)
pnpm install                      # node_modules + pnpm-lock.yaml
pnpm remove vite-tsconfig-paths
pnpm add -D @opennextjs/cloudflare wrangler @cloudflare/workers-types
pnpm add -D typescript@7
```
Notlar:
- pnpm kurulu değilse `corepack enable pnpm` ile etkinleştir (Node 20+ ile gelir).
- TS7 dağıtım etiketi/CLI adı farklıysa (ör. native binary `tsgo`), somut sürümü çöz ve raporla; kurulamıyorsa Global Constraints gereği en güncel TS'e düş ve nedenini raporla. Beklenen: `typescript` 7.x `package.json`'da.
- Sonuçta `package-lock.json` gitmiş, `pnpm-lock.yaml` gelmiş olmalı.

- [ ] **Step 2: vitest.config.ts — plugin yerine elle alias**

`vitest.config.ts` (tamamını değiştir):
```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

- [ ] **Step 3: next.config.ts — OpenNext dev bağlaması**

`next.config.ts` (tamamını değiştir):
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
};

export default nextConfig;

// Yerel `next dev`'de Cloudflare bindinglerini (D1, secrets) etkinleştirir.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
```

- [ ] **Step 4: open-next.config.ts oluştur**

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
```

- [ ] **Step 5: wrangler.jsonc oluştur**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "maviasya",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "apart-oda",
      "database_id": "REPLACE_AFTER_D1_CREATE"
    }
  ]
}
```
Not: `database_id` gerçek değeri Task 8'de `wrangler d1 create` sonrası girilir; yerel geliştirmede miniflare binding adına (`DB`) göre yerel bir DB kullanır.

- [ ] **Step 6: package.json scriptleri ekle**

`scripts` içine ekle:
```json
"deploy": "opennextjs-cloudflare build && wrangler deploy",
"preview": "opennextjs-cloudflare build && wrangler dev",
"cf-typegen": "wrangler types --env-interface CloudflareEnv"
```

- [ ] **Step 7: .dev.vars.example + .dev.vars + .gitignore**

`.dev.vars.example`:
```
APP_PIN=1234
SESSION_SECRET=change-me-to-a-long-random-string
```
(`.dev.vars` gerçek değerlerle: `SESSION_SECRET` için `openssl rand -hex 32`.)
`.dev.vars` (yerel, gitignored — aynı içerik, gerçek PIN).
`.gitignore`'a ekle:
```
.open-next
.dev.vars
```
(`.wrangler` yerel state de eklenebilir.)

- [ ] **Step 8: Tipleri üret**

Run: `pnpm cf-typegen`
Expected: `worker-configuration.d.ts` üretilir (D1 binding `DB` için global tipler). Not: `APP_PIN` bir secret olduğu için üretilen tipe girmez; `src/lib/env.ts` (Task 2) kendi `AppEnv` arayüzünde `APP_PIN`'i tanımlar.

- [ ] **Step 9: Testler hâlâ geçiyor + tip kontrolü**

Run:
```bash
pnpm test
pnpm exec tsc --noEmit   # veya TS7 native CLI (ör. tsgo --noEmit)
```
Expected: `health.test.ts` PASS (yeni alias ile), tip kontrolü temiz.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: migrate scaffold to Cloudflare OpenNext + TS7 + D1 binding"
```

---

## Task 2: env erişimi + D1 binding istemcisi + şema

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/lib/d1.ts`
- Create: `schema.sql`
- Test: `src/lib/d1.test.ts`

**Interfaces:**
- Consumes: `getCloudflareContext` (`@opennextjs/cloudflare`), D1 binding `DB`, `D1Database` tipi (`@cloudflare/workers-types`).
- Produces:
  - `interface AppEnv { DB: D1Database; APP_PIN: string; SESSION_SECRET: string }`
  - `getEnv(): AppEnv` — binding env'ini döndürür.
  - `d1Query<T>(sql: string, params?: unknown[]): Promise<T[]>` — D1 binding üzerinden SQL çalıştırır, satır dizisi döndürür.

- [ ] **Step 1: env.ts oluştur (ince sarmalayıcı — testsiz)**

`src/lib/env.ts`:
```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

export interface AppEnv {
  DB: D1Database;
  APP_PIN: string;
  SESSION_SECRET: string;
}

export function getEnv(): AppEnv {
  return getCloudflareContext().env as unknown as AppEnv;
}
```

- [ ] **Step 2: d1Query için failing test yaz (env mock'lu)**

`src/lib/d1.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env", () => ({ getEnv: vi.fn() }));
import { getEnv } from "@/lib/env";
import { d1Query } from "@/lib/d1";

function fakeDb(results: unknown[] | undefined) {
  const all = vi.fn().mockResolvedValue({ results, success: true });
  const bind = vi.fn().mockReturnValue({ all });
  const prepare = vi.fn().mockReturnValue({ bind });
  return { db: { prepare }, prepare, bind, all };
}

describe("d1Query", () => {
  it("prepare/bind/all zincirini çağırır ve satırları döndürür", async () => {
    const f = fakeDb([{ oda_no: 101 }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getEnv).mockReturnValue({ DB: f.db, APP_PIN: "x" } as any);

    const rows = await d1Query<{ oda_no: number }>("SELECT * FROM rooms WHERE oda_no = ?", [101]);

    expect(rows).toEqual([{ oda_no: 101 }]);
    expect(f.prepare).toHaveBeenCalledWith("SELECT * FROM rooms WHERE oda_no = ?");
    expect(f.bind).toHaveBeenCalledWith(101);
  });

  it("results boş/undefined ise boş dizi döndürür", async () => {
    const f = fakeDb(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getEnv).mockReturnValue({ DB: f.db, APP_PIN: "x" } as any);
    expect(await d1Query("SELECT 1")).toEqual([]);
  });
});
```

- [ ] **Step 3: Testi çalıştır, FAIL doğrula**

Run: `pnpm test d1`
Expected: FAIL ("d1Query is not a function" / modül yok).

- [ ] **Step 4: d1.ts implement et**

`src/lib/d1.ts`:
```ts
import { getEnv } from "@/lib/env";

export async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const { results } = await getEnv().DB.prepare(sql).bind(...params).all<T>();
  return results ?? [];
}
```

- [ ] **Step 5: Testi çalıştır, PASS doğrula**

Run: `pnpm test d1`
Expected: 2 test PASS.

- [ ] **Step 6: schema.sql oluştur**

`schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS rooms (
  oda_no INTEGER PRIMARY KEY,
  durum TEXT NOT NULL DEFAULT 'bos' CHECK (durum IN ('bos', 'dolu')),
  fatura_kesildi INTEGER NOT NULL DEFAULT 0 CHECK (fatura_kesildi IN (0, 1)),
  fiyat REAL NOT NULL DEFAULT 0
);

-- 101–115 seed
INSERT OR IGNORE INTO rooms (oda_no) VALUES
  (101),(102),(103),(104),(105),(106),(107),(108),
  (109),(110),(111),(112),(113),(114),(115);
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/env.ts src/lib/d1.ts src/lib/d1.test.ts schema.sql
git commit -m "feat: add D1 binding client, env accessor and schema"
```

---

## Task 3: Oda domain mantığı (doğrulama + veri erişimi)

**Files:**
- Create: `src/lib/rooms.ts`
- Test: `src/lib/rooms.test.ts`

**Interfaces:**
- Consumes: `d1Query` (`@/lib/d1`).
- Produces:
  - `type Durum = "bos" | "dolu"`
  - `interface Room { oda_no: number; durum: Durum; fatura_kesildi: 0 | 1; fiyat: number }`
  - `interface RoomPatch { durum?: Durum; fatura_kesildi?: 0 | 1; fiyat?: number }`
  - `validateRoomPatch(input: unknown): RoomPatch` — geçersizde `Error` fırlatır, en az bir alan zorunlu.
  - `getAllRooms(): Promise<Room[]>`
  - `updateRoom(oda_no: number, patch: RoomPatch): Promise<void>`

- [ ] **Step 1: validateRoomPatch için failing test yaz**

`src/lib/rooms.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { validateRoomPatch, getAllRooms, updateRoom } from "@/lib/rooms";
import * as d1 from "@/lib/d1";

describe("validateRoomPatch", () => {
  it("geçerli durum kabul eder", () => {
    expect(validateRoomPatch({ durum: "dolu" })).toEqual({ durum: "dolu" });
  });
  it("geçersiz durumu reddeder", () => {
    expect(() => validateRoomPatch({ durum: "yarim" })).toThrow(/durum/);
  });
  it("fatura_kesildi sadece 0/1 kabul eder", () => {
    expect(validateRoomPatch({ fatura_kesildi: 1 })).toEqual({ fatura_kesildi: 1 });
    expect(() => validateRoomPatch({ fatura_kesildi: 2 })).toThrow(/fatura/);
  });
  it("negatif fiyatı reddeder", () => {
    expect(() => validateRoomPatch({ fiyat: -5 })).toThrow(/fiyat/);
  });
  it("fiyatı 0 kabul eder", () => {
    expect(validateRoomPatch({ fiyat: 0 })).toEqual({ fiyat: 0 });
  });
  it("bilinmeyen alanları yok sayar, tanınanları alır", () => {
    expect(validateRoomPatch({ fiyat: 500, foo: "bar" })).toEqual({ fiyat: 500 });
  });
  it("hiç geçerli alan yoksa hata fırlatır", () => {
    expect(() => validateRoomPatch({})).toThrow(/en az bir alan/i);
  });
  it("obje olmayan girdiyi reddeder", () => {
    expect(() => validateRoomPatch(null)).toThrow(/geçersiz/i);
  });
});

describe("getAllRooms", () => {
  afterEach(() => vi.restoreAllMocks());
  it("odaları oda_no'ya göre sıralı döndürür", async () => {
    const spy = vi.spyOn(d1, "d1Query").mockResolvedValue([
      { oda_no: 101, durum: "bos", fatura_kesildi: 0, fiyat: 100 },
    ]);
    const rooms = await getAllRooms();
    expect(rooms).toHaveLength(1);
    expect(spy.mock.calls[0][0]).toMatch(/ORDER BY oda_no/i);
  });
});

describe("updateRoom", () => {
  afterEach(() => vi.restoreAllMocks());
  it("sadece gönderilen alanları UPDATE eder", async () => {
    const spy = vi.spyOn(d1, "d1Query").mockResolvedValue([]);
    await updateRoom(103, { durum: "dolu", fiyat: 750 });
    const [sql, params] = spy.mock.calls[0];
    expect(sql).toMatch(/UPDATE rooms SET durum = \?, fiyat = \? WHERE oda_no = \?/);
    expect(params).toEqual(["dolu", 750, 103]);
  });
  it("boş patch'te hata fırlatır", async () => {
    await expect(updateRoom(103, {})).rejects.toThrow(/güncellenecek alan/i);
  });
});
```

- [ ] **Step 2: Testi çalıştır, FAIL doğrula**

Run: `pnpm test rooms`
Expected: FAIL (modül/fonksiyon yok).

- [ ] **Step 3: rooms.ts implement et**

`src/lib/rooms.ts`:
```ts
import { d1Query } from "@/lib/d1";

export type Durum = "bos" | "dolu";

export interface Room {
  oda_no: number;
  durum: Durum;
  fatura_kesildi: 0 | 1;
  fiyat: number;
}

export interface RoomPatch {
  durum?: Durum;
  fatura_kesildi?: 0 | 1;
  fiyat?: number;
}

export function validateRoomPatch(input: unknown): RoomPatch {
  if (typeof input !== "object" || input === null) {
    throw new Error("Geçersiz veri");
  }
  const o = input as Record<string, unknown>;
  const patch: RoomPatch = {};

  if (o.durum !== undefined) {
    if (o.durum !== "bos" && o.durum !== "dolu") {
      throw new Error("durum 'bos' veya 'dolu' olmalı");
    }
    patch.durum = o.durum;
  }
  if (o.fatura_kesildi !== undefined) {
    if (o.fatura_kesildi !== 0 && o.fatura_kesildi !== 1) {
      throw new Error("fatura_kesildi 0 veya 1 olmalı");
    }
    patch.fatura_kesildi = o.fatura_kesildi;
  }
  if (o.fiyat !== undefined) {
    if (typeof o.fiyat !== "number" || Number.isNaN(o.fiyat) || o.fiyat < 0) {
      throw new Error("fiyat 0 veya daha büyük bir sayı olmalı");
    }
    patch.fiyat = o.fiyat;
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("En az bir alan gönderilmeli");
  }
  return patch;
}

export async function getAllRooms(): Promise<Room[]> {
  return d1Query<Room>("SELECT oda_no, durum, fatura_kesildi, fiyat FROM rooms ORDER BY oda_no");
}

export async function updateRoom(oda_no: number, patch: RoomPatch): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [];
  if (patch.durum !== undefined) {
    fields.push("durum = ?");
    params.push(patch.durum);
  }
  if (patch.fatura_kesildi !== undefined) {
    fields.push("fatura_kesildi = ?");
    params.push(patch.fatura_kesildi);
  }
  if (patch.fiyat !== undefined) {
    fields.push("fiyat = ?");
    params.push(patch.fiyat);
  }
  if (fields.length === 0) {
    throw new Error("Güncellenecek alan yok");
  }
  params.push(oda_no);
  await d1Query(`UPDATE rooms SET ${fields.join(", ")} WHERE oda_no = ?`, params);
}
```

- [ ] **Step 4: Testi çalıştır, PASS doğrula**

Run: `pnpm test rooms`
Expected: tüm testler PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rooms.ts src/lib/rooms.test.ts
git commit -m "feat: add room domain logic with validation"
```

---

## Task 4: Kimlik doğrulama (PIN + oturum token'ı)

**Files:**
- Create: `src/lib/auth.ts`
- Test: `src/lib/auth.test.ts`

**Interfaces:**
- Consumes: `getEnv()` (`@/lib/env`) → `APP_PIN`; global `crypto.subtle`.
- Produces:
  - `const SESSION_COOKIE = "apart_session"`
  - `checkPin(pin: string): boolean`
  - `expectedToken(): Promise<string>` — `APP_PIN`'den türetilen deterministik HMAC token.
  - `isAuthed(token: string | undefined): Promise<boolean>`

- [ ] **Step 1: Failing test yaz**

`src/lib/auth.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/env", () => ({ getEnv: vi.fn() }));
import { getEnv } from "@/lib/env";
import { SESSION_COOKIE, checkPin, expectedToken, isAuthed } from "@/lib/auth";

function setPin(pin: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(getEnv).mockReturnValue({ APP_PIN: pin } as any);
}

describe("auth", () => {
  beforeEach(() => {
    setPin("4242");
  });

  it("çerez adı sabit", () => {
    expect(SESSION_COOKIE).toBe("apart_session");
  });

  it("doğru PIN'i kabul, yanlışı reddeder", () => {
    expect(checkPin("4242")).toBe(true);
    expect(checkPin("0000")).toBe(false);
  });

  it("expectedToken deterministik ve PIN'e bağlı", async () => {
    const t1 = await expectedToken();
    const t2 = await expectedToken();
    expect(t1).toBe(t2);
    expect(t1).toHaveLength(64); // SHA-256 hex

    setPin("9999");
    const t3 = await expectedToken();
    expect(t3).not.toBe(t1);
  });

  it("isAuthed doğru token'ı kabul, yanlışı/eksiği reddeder", async () => {
    const token = await expectedToken();
    expect(await isAuthed(token)).toBe(true);
    expect(await isAuthed("yanlis")).toBe(false);
    expect(await isAuthed(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Testi çalıştır, FAIL doğrula**

Run: `pnpm test auth`
Expected: FAIL.

- [ ] **Step 3: auth.ts implement et**

`src/lib/auth.ts`:
```ts
import { getEnv } from "@/lib/env";

export const SESSION_COOKIE = "apart_session";
const TOKEN_MESSAGE = "apart-oda-takip-v1";

async function hmacHex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function requirePin(): string {
  const pin = getEnv().APP_PIN;
  if (!pin) throw new Error("APP_PIN tanımlı değil");
  return pin;
}

export function checkPin(pin: string): boolean {
  return pin === requirePin();
}

export async function expectedToken(): Promise<string> {
  return hmacHex(requirePin(), TOKEN_MESSAGE);
}

export async function isAuthed(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return token === (await expectedToken());
}
```

- [ ] **Step 4: Testi çalıştır, PASS doğrula**

Run: `pnpm test auth`
Expected: tüm testler PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.test.ts
git commit -m "feat: add PIN-based auth with HMAC session token"
```

---

## Task 5: API route'ları (login, rooms GET, room PATCH)

**Files:**
- Create: `src/app/api/login/route.ts`
- Create: `src/app/api/rooms/route.ts`
- Create: `src/app/api/rooms/[oda_no]/route.ts`
- Test: `src/app/api/rooms/rooms-api.test.ts`

**Interfaces:**
- Consumes: `checkPin`, `makeToken`, `isAuthed`, `SESSION_COOKIE` (`@/lib/auth`); `getAllRooms`, `updateRoom`, `validateRoomPatch` (`@/lib/rooms`).
  - Not: `makeToken()` yeni hardened token üretir (SESSION_SECRET + issued-at + 30 gün expiry); `isAuthed(token)` imza + süreyi doğrular.
- Produces (HTTP sözleşmesi):
  - `POST /api/login` body `{ pin }` → 200 + `apart_session` çerezi | 401.
  - `GET /api/rooms` → `{ rooms: Room[] }` | 401.
  - `PATCH /api/rooms/:oda_no` body `RoomPatch` → `{ ok: true }` | 400 | 401.

- [ ] **Step 1: login route implement et**

`src/app/api/login/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, checkPin, makeToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const pin = (body as { pin?: unknown } | null)?.pin;

  if (typeof pin !== "string" || !checkPin(pin)) {
    return NextResponse.json({ error: "PIN hatalı" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await makeToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
```

- [ ] **Step 2: rooms GET route implement et**

`src/app/api/rooms/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthed } from "@/lib/auth";
import { getAllRooms } from "@/lib/rooms";

export async function GET(req: NextRequest) {
  if (!(await isAuthed(req.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const rooms = await getAllRooms();
  return NextResponse.json({ rooms });
}
```

- [ ] **Step 3: room PATCH route implement et**

`src/app/api/rooms/[oda_no]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthed } from "@/lib/auth";
import { updateRoom, validateRoomPatch } from "@/lib/rooms";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ oda_no: string }> },
) {
  if (!(await isAuthed(req.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { oda_no } = await params;
  const n = Number(oda_no);
  if (!Number.isInteger(n)) {
    return NextResponse.json({ error: "Geçersiz oda no" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  try {
    const patch = validateRoomPatch(body);
    await updateRoom(n, patch);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Route testleri yaz (auth mock'lu)**

`src/app/api/rooms/rooms-api.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import * as auth from "@/lib/auth";
import * as rooms from "@/lib/rooms";
import { GET } from "@/app/api/rooms/route";
import { PATCH } from "@/app/api/rooms/[oda_no]/route";

function reqWithCookie(cookie?: string, body?: unknown): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers["cookie"] = `apart_session=${cookie}`;
  return new NextRequest("http://localhost/api/rooms", {
    method: "PATCH",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/rooms", () => {
  afterEach(() => vi.restoreAllMocks());

  it("yetkisizse 401 döner", async () => {
    vi.spyOn(auth, "isAuthed").mockResolvedValue(false);
    const res = await GET(reqWithCookie());
    expect(res.status).toBe(401);
  });

  it("yetkiliyse odaları döner", async () => {
    vi.spyOn(auth, "isAuthed").mockResolvedValue(true);
    vi.spyOn(rooms, "getAllRooms").mockResolvedValue([
      { oda_no: 101, durum: "bos", fatura_kesildi: 0, fiyat: 100 },
    ]);
    const res = await GET(reqWithCookie("token"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rooms).toHaveLength(1);
  });
});

describe("PATCH /api/rooms/[oda_no]", () => {
  beforeEach(() => vi.spyOn(auth, "isAuthed").mockResolvedValue(true));
  afterEach(() => vi.restoreAllMocks());

  it("geçerli patch'te updateRoom çağırır", async () => {
    const spy = vi.spyOn(rooms, "updateRoom").mockResolvedValue();
    const res = await PATCH(reqWithCookie("token", { durum: "dolu" }), {
      params: Promise.resolve({ oda_no: "101" }),
    });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(101, { durum: "dolu" });
  });

  it("geçersiz patch'te 400 döner", async () => {
    const res = await PATCH(reqWithCookie("token", { durum: "yarim" }), {
      params: Promise.resolve({ oda_no: "101" }),
    });
    expect(res.status).toBe(400);
  });

  it("yetkisizse 401 döner", async () => {
    vi.spyOn(auth, "isAuthed").mockResolvedValue(false);
    const res = await PATCH(reqWithCookie(undefined, { durum: "dolu" }), {
      params: Promise.resolve({ oda_no: "101" }),
    });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 5: Testleri çalıştır, PASS doğrula**

Run: `pnpm test rooms-api`
Expected: tüm testler PASS. (Not: `NextRequest` testleri Node ortamı gerektirebilir; hata olursa test dosyasının en üstüne `// @vitest-environment node` ekle.)

- [ ] **Step 6: Commit**

```bash
git add src/app/api
git commit -m "feat: add login, rooms GET and PATCH API routes"
```

---

## Task 6: Giriş ekranı (LoginForm) + istemci gate

**Files:**
- Create: `src/components/LoginForm.tsx`
- Test: `src/components/LoginForm.test.tsx`

**Interfaces:**
- Consumes: `POST /api/login`.
- Produces: `<LoginForm onSuccess={() => void} />` — PIN girişi, başarılıysa `onSuccess` çağırır, hatada mesaj gösterir.

- [ ] **Step 1: Failing test yaz**

`src/components/LoginForm.test.tsx`:
```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/LoginForm";

afterEach(() => vi.restoreAllMocks());

describe("LoginForm", () => {
  it("doğru PIN'de onSuccess çağırır", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const onSuccess = vi.fn();
    render(<LoginForm onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText(/pin/i), "1234");
    await userEvent.click(screen.getByRole("button", { name: /giriş/i }));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("yanlış PIN'de hata gösterir", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/pin/i), "0000");
    await userEvent.click(screen.getByRole("button", { name: /giriş/i }));
    expect(await screen.findByText(/hatalı/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Testi çalıştır, FAIL doğrula**

Run: `pnpm test LoginForm`
Expected: FAIL.

- [ ] **Step 3: LoginForm implement et**

`src/components/LoginForm.tsx`:
```tsx
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
```

- [ ] **Step 4: Testi çalıştır, PASS doğrula**

Run: `pnpm test LoginForm`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LoginForm.tsx src/components/LoginForm.test.tsx
git commit -m "feat: add PIN login form"
```

---

## Task 7: Oda kartı, düzenleyici ve ana ekran (grid + polling)

**Files:**
- Create: `src/components/RoomCard.tsx`
- Create: `src/components/RoomEditor.tsx`
- Modify: `src/app/page.tsx` (Task 1'deki geçici içeriği değiştir)
- Test: `src/components/RoomCard.test.tsx`

**Interfaces:**
- Consumes: `Room`, `RoomPatch`, `Durum` (`@/lib/rooms`); `<LoginForm />`; `GET /api/rooms`; `PATCH /api/rooms/:oda_no`.
- Produces:
  - `<RoomCard room={Room} onClick={() => void} />`
  - `<RoomEditor room={Room} onClose={() => void} onSave={(patch: RoomPatch) => Promise<void>} />`

- [ ] **Step 1: RoomCard için failing test yaz**

`src/components/RoomCard.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoomCard } from "@/components/RoomCard";

describe("RoomCard", () => {
  const room = { oda_no: 108, durum: "dolu" as const, fatura_kesildi: 1 as const, fiyat: 950 };

  it("oda no, durum, fiyat ve fatura durumunu gösterir", () => {
    render(<RoomCard room={room} onClick={vi.fn()} />);
    expect(screen.getByText("108")).toBeInTheDocument();
    expect(screen.getByText(/dolu/i)).toBeInTheDocument();
    expect(screen.getByText(/950/)).toBeInTheDocument();
    expect(screen.getByText(/kesildi/i)).toBeInTheDocument();
  });

  it("tıklanınca onClick çağırır", async () => {
    const onClick = vi.fn();
    render(<RoomCard room={room} onClick={onClick} />);
    await userEvent.click(screen.getByText("108"));
    expect(onClick).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Testi çalıştır, FAIL doğrula**

Run: `pnpm test RoomCard`
Expected: FAIL.

- [ ] **Step 3: RoomCard implement et**

`src/components/RoomCard.tsx`:
```tsx
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
```

- [ ] **Step 4: Testi çalıştır, PASS doğrula**

Run: `pnpm test RoomCard`
Expected: PASS.

- [ ] **Step 5: RoomEditor implement et (test opsiyonel, manuel doğrulanacak)**

`src/components/RoomEditor.tsx`:
```tsx
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
```

- [ ] **Step 6: Ana ekranı (page.tsx) yaz — gate + grid + polling**

`src/app/page.tsx` (Task 1'deki geçici içeriğin tamamını değiştir):
```tsx
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

  const load = useCallback(async () => {
    const res = await fetch("/api/rooms");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const json = await res.json();
    setRooms(json.rooms);
    setAuthed(true);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000); // 5 sn polling
    return () => clearInterval(id);
  }, [load]);

  async function saveRoom(oda_no: number, patch: RoomPatch) {
    await fetch(`/api/rooms/${oda_no}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
  }

  if (authed === null) return <p style={{ textAlign: "center", marginTop: 80 }}>Yükleniyor…</p>;
  if (!authed) return <LoginForm onSuccess={load} />;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, margin: "8px 0 16px" }}>Maviasya</h1>
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
```

- [ ] **Step 7: Tüm testleri çalıştır**

Run: `pnpm test`
Expected: tüm testler PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components src/app/page.tsx
git commit -m "feat: add room grid, card, editor and polling UI"
```

---

## Task 8: Deploy dokümanı + üretim doğrulaması

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: (tüm önceki task'lar)
- Produces: kullanıcı için uçtan uca kurulum/deploy talimatı.

- [ ] **Step 1: README.md yaz**

`README.md`:
````markdown
# Maviasya

Erdemli apartının 101–115 odalarını (durum, fatura, fiyat) takip eden
Next.js uygulaması. `@opennextjs/cloudflare` ile Cloudflare Workers'ta
çalışır, verisi Cloudflare D1'de durur.

## Yerel geliştirme

```bash
pnpm install
cp .dev.vars.example .dev.vars          # APP_PIN + SESSION_SECRET'i ayarla
pnpm exec wrangler d1 execute apartsystem --local --file=schema.sql   # yerel D1'e şema
pnpm dev
```

## Cloudflare kurulumu

1. Cloudflare hesabı aç (ücretsiz).
2. D1 veritabanı (adı `apartsystem`) — yoksa oluştur:
   ```bash
   pnpm exec wrangler d1 create apartsystem
   ```
   Çıktıdaki (veya dashboard → D1 → Settings'teki) `database_id`'yi
   `wrangler.jsonc` → `d1_databases[0].database_id` alanına yaz.
3. Şemayı uzak D1'e uygula:
   ```bash
   pnpm exec wrangler d1 execute apartsystem --remote --file=schema.sql
   ```
4. Secret'ları gir:
   ```bash
   pnpm exec wrangler secret put APP_PIN
   pnpm exec wrangler secret put SESSION_SECRET   # uzun rastgele: openssl rand -hex 32
   ```

## Deploy

```bash
pnpm deploy        # opennextjs-cloudflare build && wrangler deploy
```
Verilen `*.workers.dev` URL'ini telefonda/bilgisayarda aç, PIN ile gir.

## Bindingler / secret'lar

| Ad              | Tür         | Nerede                                          |
|-----------------|-------------|-------------------------------------------------|
| `DB`            | D1 binding  | `wrangler.jsonc` (`database_name: apartsystem`) |
| `APP_PIN`       | secret      | yerelde `.dev.vars`, prod'da `wrangler secret`  |
| `SESSION_SECRET`| secret      | yerelde `.dev.vars`, prod'da `wrangler secret`  |

Kodda üçü de `getCloudflareContext().env` üzerinden okunur (bkz. `src/lib/env.ts`).

## Güvenlik notları

- D1'e binding ile erişilir; REST API / API token YOK.
- `APP_PIN` ve `SESSION_SECRET` yalnızca sunucu-taraflı binding env'inde; tarayıcıya düşmez.
- Oturum token'ı PIN'den türetilmez (SESSION_SECRET ile imzalanır) + 30 gün expiry → sızan çerezden PIN çıkmaz, süresiz replay olmaz.
- Production build'de source map kapalı.
- PIN'i değiştirmek için `wrangler secret put APP_PIN` ile güncelle.
````

- [ ] **Step 2: Production build ile source map kapalı olduğunu doğrula**

Run:
```bash
pnpm build
```
Expected: `next build` başarılı. Tarayıcı chunk'ları için `.js.map` üretilmediğini teyit et:
```bash
find .next/static -name "*.js.map" | head
```
Expected: çıktı boş (source map yok).

- [ ] **Step 3: Uçtan uca manuel doğrulama (yerel D1 + bindingler ile)**

`.dev.vars` (APP_PIN) dolu ve yerel D1 şeması uygulanmış halde:
```bash
pnpm dev
```
- `http://localhost:3000` → PIN ekranı gelir.
- Yanlış PIN → "PIN hatalı".
- Doğru PIN → 101–115 kartları görünür.
- Bir karta tıkla → durum/fatura/fiyat değiştir → Kaydet → kart güncellenir.
- İkinci bir tarayıcı sekmesinde ~5 sn içinde aynı değişiklik görünür.

  Not: binding'ler `initOpenNextCloudflareForDev()` sayesinde `next dev`'de
  çalışır. Sorun olursa `pnpm preview` (wrangler dev) ile de doğrulanabilir.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add setup and deployment guide"
```

---

## Self-Review (plan yazarı tarafından yapıldı)

**Spec kapsam kontrolü (2026-07-20 Cloudflare/TS7 revizyonu):**
- 4 parametre (oda_no, durum, fatura_kesildi, fiyat) → Task 2 şema + Task 3 model ✓
- 101–115 sabit + seed → Task 2 `schema.sql` ✓
- Web (telefon + bilgisayar), grid + responsive → Task 7 `auto-fill minmax` ✓
- Ortak bulut, çok kullanıcı → Cloudflare D1 binding (Task 1B + Task 2) ✓
- Canlı senkron (~5 sn polling) → Task 7 `setInterval` ✓
- PIN girişi → Task 4 (auth) + Task 5 (login route) + Task 6 (form) ✓
- Secret'lar tarayıcıda yok, binding env'inde → Task 1B/2/4 (`getEnv`) ✓
- Source map kapalı → Task 1B next.config + Task 8 doğrulama ✓
- CORS yok (kendi /api) → Task 5/7 ✓
- Cloudflare Workers (OpenNext) + D1 binding → Task 1B + Task 2 + Task 8 ✓
- TS7 → Task 1B ✓
- Geçmiş yok, oda ekle/sil yok → sadece GET + PATCH, kapsam dışı korundu ✓

**Placeholder taraması:** Kod adımlarının tümü tam içerik içeriyor; tek bilinçli yer tutucu `wrangler.jsonc` → `database_id` ("REPLACE_AFTER_D1_CREATE"), Task 8'de gerçek değerle doldurulur.

**Tip tutarlılığı:** `AppEnv`/`getEnv` Task 2'de (`env.ts`) tanımlı; `d1.ts` ve `auth.ts` (Task 4) tüketir. `Room`, `RoomPatch`, `Durum` Task 3'te tanımlı; Task 5/7'de aynı isimlerle kullanılıyor. `SESSION_COOKIE`, `isAuthed`, `expectedToken`, `checkPin` Task 4'te tanımlı; Task 5'te aynı imzalarla tüketiliyor. `getAllRooms`, `updateRoom`, `validateRoomPatch` Task 3 → Task 5 tutarlı. `d1Query` Task 2 → Task 3 tutarlı.
