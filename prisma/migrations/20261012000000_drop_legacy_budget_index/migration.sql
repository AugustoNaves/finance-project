-- A migration 20260630090000_add_budgets criou o índice único global
-- "budgets_category_month_key" (categoria + mês, sem usuário). A migration
-- 20260701090000_add_users_and_ownership tentou removê-lo com
-- DROP CONSTRAINT IF EXISTS, que não remove índices, e ele permaneceu ao lado
-- da restrição por usuário. Resultado: dois usuários não conseguiam ter
-- orçamento da mesma categoria no mesmo mês.
DROP INDEX IF EXISTS "budgets_category_month_key";
