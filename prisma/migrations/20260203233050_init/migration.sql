-- CreateTable
CREATE TABLE "Fund" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "cik" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Filing" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fundId" INTEGER NOT NULL,
    "accessionNumber" TEXT NOT NULL,
    "reportDate" DATETIME NOT NULL,
    "filedDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Filing_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Security" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cusip" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "ticker" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Holding" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filingId" INTEGER NOT NULL,
    "securityId" INTEGER NOT NULL,
    "value" BIGINT NOT NULL,
    "shares" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Holding_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "Filing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Holding_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "Security" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "fundsProcessed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Fund_cik_key" ON "Fund"("cik");

-- CreateIndex
CREATE UNIQUE INDEX "Filing_accessionNumber_key" ON "Filing"("accessionNumber");

-- CreateIndex
CREATE INDEX "Filing_fundId_idx" ON "Filing"("fundId");

-- CreateIndex
CREATE INDEX "Filing_reportDate_idx" ON "Filing"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "Security_cusip_key" ON "Security"("cusip");

-- CreateIndex
CREATE INDEX "Security_ticker_idx" ON "Security"("ticker");

-- CreateIndex
CREATE INDEX "Holding_filingId_idx" ON "Holding"("filingId");

-- CreateIndex
CREATE INDEX "Holding_securityId_idx" ON "Holding"("securityId");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_filingId_securityId_key" ON "Holding"("filingId", "securityId");
