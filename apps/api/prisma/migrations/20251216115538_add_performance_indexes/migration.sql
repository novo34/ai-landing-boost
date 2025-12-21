-- CreateIndex
CREATE INDEX `Channel_tenantId_status_idx` ON `channel`(`tenantId`, `status`);

-- CreateIndex
CREATE INDEX `Conversation_tenantId_status_idx` ON `conversation`(`tenantId`, `status`);

-- CreateIndex
CREATE INDEX `Conversation_tenantId_agentId_idx` ON `conversation`(`tenantId`, `agentId`);

-- CreateIndex
CREATE INDEX `Conversation_createdAt_idx` ON `conversation`(`createdAt`);

-- CreateIndex
CREATE INDEX `TenantMembership_tenantId_role_idx` ON `tenantmembership`(`tenantId`, `role`);
