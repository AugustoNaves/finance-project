-- Importação de fatura por PDF. Não altera a tabela "transactions":
-- o vínculo com o lote fica em "import_batch_items".
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "issuer" TEXT,
    "referenceMonth" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "statedTotal" DOUBLE PRECISION,
    "importedTotal" DOUBLE PRECISION NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_batch_items" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "import_batch_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "category_rules" (
    "id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "category_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "import_batches_userId_idx" ON "import_batches"("userId");
CREATE INDEX "import_batches_userId_fileHash_idx" ON "import_batches"("userId", "fileHash");
CREATE UNIQUE INDEX "import_batch_items_transactionId_key" ON "import_batch_items"("transactionId");
CREATE INDEX "import_batch_items_batchId_idx" ON "import_batch_items"("batchId");
CREATE UNIQUE INDEX "category_rules_userId_pattern_key" ON "category_rules"("userId", "pattern");
CREATE INDEX "category_rules_userId_idx" ON "category_rules"("userId");

ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_batch_items" ADD CONSTRAINT "import_batch_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_batch_items" ADD CONSTRAINT "import_batch_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
