-- =============================================================
-- Initial migration — 3D Printing Chatbot & Invoice Pipeline
-- =============================================================

-- Enums
CREATE TYPE "ConversationStatus" AS ENUM (
  'collecting_data',
  'awaiting_internal_input',
  'completed'
);

CREATE TYPE "MessageRole" AS ENUM (
  'user',
  'assistant',
  'system'
);

CREATE TYPE "ProjectStatus" AS ENUM (
  'draft',
  'active',
  'completed',
  'cancelled'
);

CREATE TYPE "EstimateStatus" AS ENUM (
  'draft',
  'awaiting_internal_input',
  'approved',
  'rejected'
);

CREATE TYPE "InvoiceStatus" AS ENUM (
  'draft',
  'sent',
  'paid',
  'cancelled'
);

CREATE TYPE "PrintMaterial" AS ENUM (
  'PLA',
  'PETG',
  'ABS',
  'TPU',
  'RESIN',
  'NYLON',
  'OTHER'
);

CREATE TYPE "PrintQuality" AS ENUM (
  'draft',
  'standard',
  'high',
  'ultra'
);

-- clients
CREATE TABLE "clients" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "name"       TEXT         NOT NULL,
  "phone"      TEXT         NOT NULL,
  "email"      TEXT,
  "company"    TEXT,
  "notes"      TEXT,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clients_phone_key" ON "clients"("phone");

-- conversations
CREATE TABLE "conversations" (
  "id"         UUID                  NOT NULL DEFAULT gen_random_uuid(),
  "phone"      TEXT                  NOT NULL,
  "status"     "ConversationStatus"  NOT NULL DEFAULT 'collecting_data',
  "client_id"  UUID,
  "created_at" TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversations_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "conversations_phone_key" ON "conversations"("phone");
CREATE INDEX "conversations_phone_idx"  ON "conversations"("phone");
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- messages
CREATE TABLE "messages" (
  "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" UUID          NOT NULL,
  "role"            "MessageRole" NOT NULL,
  "content"         TEXT          NOT NULL,
  "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Composite index: fetch last N messages per conversation efficiently
CREATE INDEX "messages_conversation_id_created_at_idx"
  ON "messages"("conversation_id", "created_at" DESC);

-- projects
CREATE TABLE "projects" (
  "id"           UUID            NOT NULL DEFAULT gen_random_uuid(),
  "client_id"    UUID            NOT NULL,
  "name"         TEXT            NOT NULL,
  "description"  TEXT,
  "status"       "ProjectStatus" NOT NULL DEFAULT 'draft',
  "material"     "PrintMaterial",
  "quality"      "PrintQuality",
  "file_url"     TEXT,
  "weight_grams" DECIMAL(8,2),
  "print_hours"  DECIMAL(6,2),
  "notes"        TEXT,
  "created_at"   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "projects_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "projects_client_id_idx" ON "projects"("client_id");

-- estimates
CREATE TABLE "estimates" (
  "id"         UUID             NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID             NOT NULL,
  "status"     "EstimateStatus" NOT NULL DEFAULT 'draft',
  "notes"      TEXT,
  "subtotal"   DECIMAL(10,2),
  "tax"        DECIMAL(10,2),
  "total"      DECIMAL(10,2),
  "created_at" TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT "estimates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "estimates_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "estimates_project_id_idx" ON "estimates"("project_id");
CREATE INDEX "estimates_status_idx"     ON "estimates"("status");

-- estimate_items
CREATE TABLE "estimate_items" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "estimate_id" UUID        NOT NULL,
  "description" TEXT        NOT NULL,
  "quantity"    INTEGER     NOT NULL DEFAULT 1,
  "unit_price"  DECIMAL(10,2),
  "total_price" DECIMAL(10,2),
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "estimate_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "estimate_items_estimate_id_fkey"
    FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "estimate_items_estimate_id_idx" ON "estimate_items"("estimate_id");

-- invoices
CREATE TABLE "invoices" (
  "id"             UUID            NOT NULL DEFAULT gen_random_uuid(),
  "estimate_id"    UUID            NOT NULL,
  "client_id"      UUID            NOT NULL,
  "status"         "InvoiceStatus" NOT NULL DEFAULT 'draft',
  "invoice_number" TEXT,
  "due_date"       TIMESTAMPTZ,
  "paid_at"        TIMESTAMPTZ,
  "notes"          TEXT,
  "created_at"     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoices_estimate_id_key" UNIQUE ("estimate_id"),
  CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number"),
  CONSTRAINT "invoices_estimate_id_fkey"
    FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "invoices_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "invoices_client_id_idx" ON "invoices"("client_id");
CREATE INDEX "invoices_status_idx"    ON "invoices"("status");
