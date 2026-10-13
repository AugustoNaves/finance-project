import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";
import { card, confirmDeletion, formError, metric, modal, money, section } from "./support/ui";

const goalForm = (page: Page) => page.locator("form").filter({ has: page.getByLabel("Nome da meta") });
const goals = (page: Page) => section(page, "Metas financeiras");

test.describe("Metas financeiras (Planejamento)", () => {
  test("estado vazio", async ({ page, account }) => {
    void account;
    await page.goto("/planning");

    await expect(goals(page).getByText("0 meta(s) em andamento")).toBeVisible();
    await expect(page.getByText("Nenhuma meta cadastrada ainda.")).toBeVisible();
  });

  test("cria meta com valor atual e prazo, calcula o progresso e persiste", async ({ page, api }) => {
    await page.goto("/planning");
    await page.getByRole("button", { name: "+ Nova meta" }).click();

    const dialog = modal(page, "Nova meta");
    const form = goalForm(page);

    await expect(dialog).toBeVisible();
    await form.getByLabel("Nome da meta").fill("Reserva de emergência");
    await form.getByLabel("Valor alvo").fill("10000");
    await form.getByLabel("Valor atual").fill("2500");
    await form.getByLabel("Prazo (opcional)").fill("2026-12-20");
    await form.getByLabel("Cor").fill("#0ea5e9");
    await form.getByRole("button", { name: "Salvar meta" }).click();

    await expect(dialog).toBeHidden();
    await expect(goals(page).getByText("1 meta(s) em andamento")).toBeVisible();

    const goal = card(page, "Reserva de emergência");

    await expect(goal).toContainText("25%");
    await expect(metric(goal, "Atual")).toContainText(money(2500));
    await expect(metric(goal, "Alvo")).toContainText(money(10000));
    await expect(metric(goal, "Restante")).toContainText(money(7500));
    await expect(goal).toContainText("Prazo: 20/12/2026");
    await expect(goal.getByLabel("Progresso de 25%")).toBeVisible();

    await page.reload();
    await expect(card(page, "Reserva de emergência")).toContainText("25%");
    expect(await api.list("goals")).toEqual([
      expect.objectContaining({
        name: "Reserva de emergência",
        targetAmount: 10000,
        currentAmount: 2500,
        color: "#0ea5e9",
      }),
    ]);
  });

  test("meta sem valor atual e sem prazo começa em 0%", async ({ page, account }) => {
    void account;
    await page.goto("/planning");
    await page.getByRole("button", { name: "+ Nova meta" }).click();
    await goalForm(page).getByLabel("Nome da meta").fill("Notebook novo");
    await goalForm(page).getByLabel("Valor alvo").fill("7500.90");
    await goalForm(page).getByRole("button", { name: "Salvar meta" }).click();

    const goal = card(page, "Notebook novo");

    await expect(goal).toContainText("0%");
    await expect(metric(goal, "Atual")).toContainText(money(0));
    await expect(metric(goal, "Restante")).toContainText(money(7500.9));
    await expect(goal.getByText(/Prazo:/)).toHaveCount(0);
  });

  test("atualiza o progresso e os dados da meta", async ({ page, api }) => {
    await api.createGoal({ name: "Viagem", targetAmount: 8000, currentAmount: 2000, deadline: "2027-01-10T00:00:00.000Z" });
    await page.goto("/planning");
    await expect(card(page, "Viagem")).toContainText("25%");

    await card(page, "Viagem").getByRole("button", { name: "Atualizar progresso" }).click();

    const dialog = modal(page, "Atualizar meta");
    const form = goalForm(page);

    await expect(form.getByLabel("Nome da meta")).toHaveValue("Viagem");
    await expect(form.getByLabel("Valor alvo")).toHaveValue("8000");
    await expect(form.getByLabel("Valor atual")).toHaveValue("2000");
    await expect(form.getByLabel("Prazo (opcional)")).toHaveValue("2027-01-10");

    await form.getByLabel("Nome da meta").fill("Viagem ao Chile");
    await form.getByLabel("Valor atual").fill("6000");
    await form.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(dialog).toBeHidden();

    const goal = card(page, "Viagem ao Chile");

    await expect(goal).toContainText("75%");
    await expect(metric(goal, "Restante")).toContainText(money(2000));
    await expect(goal).toContainText("Prazo: 10/01/2027");

    await page.reload();
    await expect(card(page, "Viagem ao Chile")).toContainText("75%");
  });

  test("meta ultrapassada mostra mais de 100% e restante zerado", async ({ page, api }) => {
    await api.createGoal({ name: "Bicicleta", targetAmount: 2000, currentAmount: 2500 });
    await page.goto("/planning");

    const goal = card(page, "Bicicleta");

    await expect(goal).toContainText("125%");
    await expect(metric(goal, "Restante")).toContainText(money(0));
    await expect(goal.getByLabel("Progresso de 100%")).toBeVisible();
  });

  test("exclui meta após confirmação", async ({ page, api }) => {
    await api.createGoal({ name: "Curso de inglês", targetAmount: 3000 });
    await api.createGoal({ name: "Carro", targetAmount: 60000, currentAmount: 6000 });
    await page.goto("/planning");
    await expect(goals(page).getByText("2 meta(s) em andamento")).toBeVisible();

    await card(page, "Curso de inglês").getByRole("button", { name: "Excluir" }).click();

    const dialog = modal(page, "Confirmar exclusão");

    await expect(dialog).toContainText("Tem certeza que deseja excluir a meta Curso de inglês?");
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(card(page, "Curso de inglês")).toBeVisible();

    await card(page, "Curso de inglês").getByRole("button", { name: "Excluir" }).click();
    await confirmDeletion(page);

    await expect(page.getByRole("heading", { name: "Curso de inglês" })).toHaveCount(0);
    await expect(goals(page).getByText("1 meta(s) em andamento")).toBeVisible();
    await expect(card(page, "Carro")).toContainText("10%");

    await page.reload();
    await expect(goals(page).getByText("1 meta(s) em andamento")).toBeVisible();
    expect(await api.list("goals")).toHaveLength(1);
  });

  test("formulário barra valor alvo zerado e nome vazio", async ({ page, api }) => {
    await page.goto("/planning");
    await page.getByRole("button", { name: "+ Nova meta" }).click();

    const form = goalForm(page);

    await form.getByRole("button", { name: "Salvar meta" }).click();
    await expect(form.getByLabel("Nome da meta")).toHaveJSProperty("validity.valueMissing", true);

    await form.getByLabel("Nome da meta").fill("Meta inválida");
    await form.getByLabel("Valor alvo").fill("0");
    await form.getByRole("button", { name: "Salvar meta" }).click();
    await expect(form.getByLabel("Valor alvo")).toHaveJSProperty("validity.rangeUnderflow", true);

    await expect(modal(page, "Nova meta")).toBeVisible();
    expect(await api.list("goals")).toHaveLength(0);
  });

  test("erro do servidor aparece no modal e mantém os dados digitados", async ({ page, api }) => {
    await page.route("**/api/goals", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 500, json: { error: "Erro ao salvar meta." } });
        return;
      }

      await route.continue();
    });
    await page.goto("/planning");
    await page.getByRole("button", { name: "+ Nova meta" }).click();

    const dialog = modal(page, "Nova meta");
    const form = goalForm(page);

    await form.getByLabel("Nome da meta").fill("Meta com falha");
    await form.getByLabel("Valor alvo").fill("1000");
    await form.getByRole("button", { name: "Salvar meta" }).click();

    await expect(formError(dialog)).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(form.getByLabel("Nome da meta")).toHaveValue("Meta com falha");
    await expect(form.getByLabel("Valor alvo")).toHaveValue("1000");
    expect(await api.list("goals")).toHaveLength(0);
  });
});
