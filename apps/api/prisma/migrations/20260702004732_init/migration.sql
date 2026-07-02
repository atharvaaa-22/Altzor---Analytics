-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoLight" TEXT,
    "logoDark" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "fontFamily" TEXT,
    "customDomain" TEXT,
    "queryTimeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ANALYST',
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "lastActiveAt" DATETIME,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "database_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "host" TEXT,
    "port" INTEGER,
    "database" TEXT,
    "username" TEXT,
    "encryptedPassword" TEXT,
    "encryptionIV" TEXT,
    "encryptionTag" TEXT,
    "connectionString" TEXT,
    "sslEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTestedAt" DATETIME,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "database_connections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "conversations_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "database_connections" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "generatedSql" TEXT,
    "queryResults" TEXT,
    "resultMetadata" TEXT,
    "chartType" TEXT,
    "chartOverride" TEXT,
    "narrativeSummary" TEXT,
    "confidenceScore" REAL,
    "lineage" TEXT,
    "connectionId" TEXT,
    "aiModel" TEXT,
    "executionTimeMs" INTEGER,
    "rowCount" INTEGER,
    "costEstimate" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "messages_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "database_connections" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "query_feedbacks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "query_feedbacks_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "query_feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dashboards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "layout" TEXT,
    "filters" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publicSlug" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "dashboards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dashboards_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dashboardId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "savedQueryId" TEXT,
    "naturalQuery" TEXT,
    "chartType" TEXT,
    "chartConfig" TEXT,
    "gridPosition" TEXT NOT NULL,
    "markdownContent" TEXT,
    "lastRefreshedAt" DATETIME,
    "cachedData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "dashboard_widgets_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "dashboards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dashboard_widgets_savedQueryId_fkey" FOREIGN KEY ("savedQueryId") REFERENCES "saved_queries" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dashboard_shares" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dashboardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dashboard_shares_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "dashboards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dashboard_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "saved_queries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "naturalQuery" TEXT NOT NULL,
    "generatedSql" TEXT NOT NULL,
    "tags" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateParams" TEXT,
    "chartType" TEXT,
    "chartConfig" TEXT,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT,
    "lastRunAt" DATETIME,
    "lastRunRowCount" INTEGER,
    "lastRunDurationMs" INTEGER,
    "lastRunCost" REAL,
    "isBroadcast" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "saved_queries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "saved_queries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "saved_queries_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "database_connections" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "query_shares" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "savedQueryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "query_shares_savedQueryId_fkey" FOREIGN KEY ("savedQueryId") REFERENCES "saved_queries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "query_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "semantic_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "formula" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "formatPattern" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "semantic_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "semantic_dimensions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceTable" TEXT NOT NULL,
    "sourceColumn" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "synonyms" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "semantic_dimensions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "uploaded_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalName" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "ephemeralTable" TEXT,
    "columnSchema" TEXT,
    "rowCount" INTEGER,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "uploaded_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "uploaded_files_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dashboardId" TEXT,
    "widgetId" TEXT,
    "parentId" TEXT,
    "mentions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comments_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "dashboards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "annotations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "dataPointRef" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "annotations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "email_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_customDomain_key" ON "organizations"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "database_connections_organizationId_idx" ON "database_connections"("organizationId");

-- CreateIndex
CREATE INDEX "conversations_userId_idx" ON "conversations"("userId");

-- CreateIndex
CREATE INDEX "conversations_organizationId_idx" ON "conversations"("organizationId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_userId_idx" ON "messages"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "query_feedbacks_messageId_key" ON "query_feedbacks"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "dashboards_publicSlug_key" ON "dashboards"("publicSlug");

-- CreateIndex
CREATE INDEX "dashboards_organizationId_idx" ON "dashboards"("organizationId");

-- CreateIndex
CREATE INDEX "dashboards_userId_idx" ON "dashboards"("userId");

-- CreateIndex
CREATE INDEX "dashboard_widgets_dashboardId_idx" ON "dashboard_widgets"("dashboardId");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_shares_dashboardId_userId_key" ON "dashboard_shares"("dashboardId", "userId");

-- CreateIndex
CREATE INDEX "saved_queries_organizationId_idx" ON "saved_queries"("organizationId");

-- CreateIndex
CREATE INDEX "saved_queries_userId_idx" ON "saved_queries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "query_shares_savedQueryId_userId_key" ON "query_shares"("savedQueryId", "userId");

-- CreateIndex
CREATE INDEX "semantic_metrics_organizationId_idx" ON "semantic_metrics"("organizationId");

-- CreateIndex
CREATE INDEX "semantic_dimensions_organizationId_idx" ON "semantic_dimensions"("organizationId");

-- CreateIndex
CREATE INDEX "uploaded_files_organizationId_idx" ON "uploaded_files"("organizationId");

-- CreateIndex
CREATE INDEX "comments_dashboardId_idx" ON "comments"("dashboardId");

-- CreateIndex
CREATE INDEX "comments_userId_idx" ON "comments"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_organizationId_name_key" ON "email_templates"("organizationId", "name");
