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
