import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { sendPasswordResetEmail } from "@/lib/resend";

const resetUrl = "http://localhost:3000/reset-password?token=abc";

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendPasswordResetEmail", () => {
  it("envia o e-mail com remetente configurado, destinatário e assunto em português", async () => {
    await sendPasswordResetEmail("maria@example.com", resetUrl);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Financas <test@example.com>",
        to: "maria@example.com",
        subject: "Redefinição de senha — Finanças Pessoais",
      }),
    );
  });

  it("inclui o link de redefinição nas versões HTML e texto", async () => {
    await sendPasswordResetEmail("maria@example.com", resetUrl);

    const { html, text } = sendMock.mock.calls[0][0];

    expect(html).toContain(`href="${resetUrl}"`);
    expect(text).toContain(resetUrl);
    expect(text).toContain("válido por 1 hora");
  });

  it("retorna o resultado do provedor em caso de sucesso", async () => {
    await expect(sendPasswordResetEmail("maria@example.com", resetUrl)).resolves.toEqual({
      data: { id: "email-1" },
      error: null,
    });
  });

  it("falha quando EMAIL_FROM não está configurado, sem chamar o provedor", async () => {
    vi.stubEnv("EMAIL_FROM", "");

    await expect(sendPasswordResetEmail("maria@example.com", resetUrl)).rejects.toThrow(
      "EMAIL_FROM não configurado.",
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("lança erro quando o provedor responde com erro", async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: "domínio não verificado" } });

    await expect(sendPasswordResetEmail("maria@example.com", resetUrl)).rejects.toThrow(
      "Falha ao enviar email: domínio não verificado",
    );
  });

  it("propaga erros de rede do provedor", async () => {
    sendMock.mockRejectedValue(new Error("timeout"));

    await expect(sendPasswordResetEmail("maria@example.com", resetUrl)).rejects.toThrow("timeout");
  });
});
