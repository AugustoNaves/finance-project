import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dateKeyToISOString,
  getDateKey,
  getLocalDateKey,
  getLocalMonthKey,
  getMonthKey,
} from "@/utils/dates";

describe("utils/dates", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("getLocalDateKey usa o dia do calendário local, não o dia em UTC", () => {
    const lateEvening = new Date(2026, 9, 12, 22, 30);

    expect(getLocalDateKey(lateEvening)).toBe("2026-10-12");
  });

  it("getLocalDateKey usa a data atual quando chamado sem argumento", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 9, 0));

    expect(getLocalDateKey()).toBe("2026-01-05");
    expect(getLocalMonthKey()).toBe("2026-01");
  });

  it("getLocalMonthKey preenche o mês com zero à esquerda", () => {
    expect(getLocalMonthKey(new Date(2026, 2, 31, 23, 59))).toBe("2026-03");
  });

  it("getDateKey devolve o dia gravado (meia-noite UTC) sem deslocar pelo fuso", () => {
    expect(getDateKey("2026-10-13T00:00:00.000Z")).toBe("2026-10-13");
    expect(getDateKey(new Date("2026-08-01T00:00:00.000Z"))).toBe("2026-08-01");
  });

  it("getMonthKey mantém no mês correto uma transação do dia 1º", () => {
    expect(getMonthKey("2026-08-01T00:00:00.000Z")).toBe("2026-08");
  });

  it("getDateKey e getMonthKey devolvem string vazia para data inválida, sem lançar erro", () => {
    expect(getDateKey("não é uma data")).toBe("");
    expect(getMonthKey("não é uma data")).toBe("");
  });

  it("dateKeyToISOString e getDateKey são inversos", () => {
    const iso = dateKeyToISOString("2026-12-31");

    expect(iso).toBe("2026-12-31T00:00:00.000Z");
    expect(getDateKey(iso)).toBe("2026-12-31");
  });
});
