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
