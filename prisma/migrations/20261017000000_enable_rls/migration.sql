-- Liga Row Level Security em todas as tabelas do schema public, sem políticas.
-- Efeito: a API REST automática do Supabase (papéis anon e authenticated) não lê
-- nem altera nenhuma linha. O app não é afetado: o Prisma conecta como dono das
-- tabelas (postgres, com BYPASSRLS).
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_batch_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "category_rules" ENABLE ROW LEVEL SECURITY;

-- No Supabase, também retira as permissões dos papéis públicos nas tabelas
-- atuais e nas que forem criadas depois. Em Postgres sem esses papéis
-- (ambiente local e testes), não faz nada.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
  END IF;
END
$$;
