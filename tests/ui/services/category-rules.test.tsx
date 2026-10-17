import { describe, expect, it } from "vitest";
import { deleteCategoryRule, getCategoryRules } from "@/services/categoryRules";
import { ApiError } from "@/services/http";
import { mockApi, networkError, reply, replyRaw } from "../helpers/api";

describe("Serviço de categoryRules", () => {
  describe("getCategoryRules", () => {
    it("faz GET /api/category-rules e devolve as regras", async () => {
      const mockRules = [
        { id: "1", pattern: "NETFLIX", category: "Lazer", type: "outcome" },
        { id: "2", pattern: "UBER", category: "Transporte", type: "outcome" },
      ];
      const api = mockApi({ "GET /api/category-rules": mockRules });

      await expect(getCategoryRules()).resolves.toEqual(mockRules);
      expect(api.calls).toEqual([
        expect.objectContaining({ method: "GET", path: "/api/category-rules" }),
      ]);
    });

    it("devolve [] quando a resposta da API não é um array", async () => {
      mockApi({ "GET /api/category-rules": { data: [] } });

      await expect(getCategoryRules()).resolves.toEqual([]);
    });

    it("lança ApiError quando a API retorna erro (ex: 401)", async () => {
      mockApi({
        "GET /api/category-rules": reply(401, { error: "Não autenticado." }),
      });

      const error = await getCategoryRules().catch((reason: unknown) => reason);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        name: "ApiError",
        message: "Não autenticado.",
        status: 401,
      });
    });

    it("lança ApiError com mensagem fallback quando o erro não é JSON", async () => {
      mockApi({
        "GET /api/category-rules": replyRaw(500, "<html>erro</html>"),
      });

      await expect(getCategoryRules()).rejects.toMatchObject({
        name: "ApiError",
        message: "Não foi possível carregar as regras de categorização.",
        status: 500,
      });
    });

    it("propaga erro de rede", async () => {
      mockApi({ "GET /api/category-rules": networkError() });

      await expect(getCategoryRules()).rejects.toThrow("Failed to fetch");
    });
  });

  describe("deleteCategoryRule", () => {
    it("faz DELETE /api/category-rules/:id e devolve true", async () => {
      const api = mockApi({ "DELETE /api/category-rules/rule-1": { message: "ok" } });

      await expect(deleteCategoryRule("rule-1")).resolves.toBe(true);
      expect(api.calls).toEqual([
        expect.objectContaining({
          method: "DELETE",
          path: "/api/category-rules/rule-1",
        }),
      ]);
    });

    it("lança ApiError com a mensagem e status da API quando falha", async () => {
      mockApi({
        "DELETE /api/category-rules/rule-1": reply(404, { error: "Regra não encontrada." }),
      });

      const error = await deleteCategoryRule("rule-1").catch((reason: unknown) => reason);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        name: "ApiError",
        message: "Regra não encontrada.",
        status: 404,
      });
    });

    it("usa a mensagem fallback quando o corpo do erro não é JSON", async () => {
      mockApi({
        "DELETE /api/category-rules/rule-1": replyRaw(500, "erro"),
      });

      await expect(deleteCategoryRule("rule-1")).rejects.toMatchObject({
        name: "ApiError",
        message: "Não foi possível excluir a regra de categorização.",
        status: 500,
      });
    });
  });
});
