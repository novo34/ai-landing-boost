/**
 * Cliente API para el panel de plataforma
 * Todas las funciones usan traducciones con claves i18n
 */

import { apiClient } from './client';

export interface PlatformMetrics {
  tenants: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
    newLast30Days: number;
  };
  users: {
    total: number;
    activeLast30Days: number;
  };
  usage: {
    agents: number;
    channels: number;
    conversations: number;
  };
  revenue: {
    mrr: number;
  };
}

export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  country: string;
  plan: string | null;
  subscriptionStatus: string | null;
  userCount: number;
  agentCount: number;
  createdAt: string;
}

export interface PlatformTenantListResponse {
  tenants: PlatformTenant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PlatformAuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

/**
 * Obtiene métricas globales del SaaS
 */
export async function getPlatformMetrics(): Promise<{ success: boolean; data: PlatformMetrics }> {
  return apiClient.get('/platform/metrics');
}

/**
 * Lista todos los tenants con filtros
 */
export async function listPlatformTenants(filters?: {
  status?: string;
  planId?: string;
  country?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; data: PlatformTenantListResponse }> {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.planId) queryParams.append('planId', filters.planId);
  if (filters?.country) queryParams.append('country', filters.country);
  if (filters?.search) queryParams.append('search', filters.search);
  if (filters?.page) queryParams.append('page', filters.page.toString());
  if (filters?.limit) queryParams.append('limit', filters.limit.toString());
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/platform/tenants?${queryString}` : '/platform/tenants';
  return apiClient.get(endpoint);
}

/**
 * Obtiene detalles de un tenant
 */
export async function getPlatformTenantDetails(tenantId: string): Promise<{ success: boolean; data: any }> {
  return apiClient.get(`/platform/tenants/${tenantId}`);
}

/**
 * Crea un nuevo tenant
 */
export async function createPlatformTenant(data: {
  name: string;
  slug: string;
  country?: string;
  dataRegion?: string;
  defaultLocale?: string;
  timeZone?: string;
  ownerEmail: string;
  ownerName?: string;
  planId?: string;
  initialStatus?: 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
  trialEndsAt?: string;
}): Promise<{ success: boolean; data: any }> {
  return apiClient.post('/platform/tenants', data);
}

/**
 * Actualiza un tenant
 */
export async function updatePlatformTenant(
  tenantId: string,
  data: {
    name?: string;
    slug?: string;
    country?: string;
    dataRegion?: string;
    status?: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED';
    trialEndsAt?: string;
  },
): Promise<{ success: boolean; data: any }> {
  return apiClient.put(`/platform/tenants/${tenantId}`, data);
}

/**
 * Suspende un tenant
 */
export async function suspendPlatformTenant(tenantId: string, reason: string): Promise<{ success: boolean; data: any }> {
  return apiClient.post(`/platform/tenants/${tenantId}/suspend`, { reason });
}

/**
 * Reactiva un tenant
 */
export async function reactivatePlatformTenant(tenantId: string): Promise<{ success: boolean; data: any }> {
  return apiClient.post(`/platform/tenants/${tenantId}/reactivate`);
}

/**
 * Elimina un tenant
 */
export async function deletePlatformTenant(tenantId: string): Promise<{ success: boolean; data: any }> {
  return apiClient.delete(`/platform/tenants/${tenantId}`);
}

/**
 * Obtiene logs de auditoría
 */
export async function getPlatformAuditLogs(filters?: {
  action?: string;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; data: { logs: PlatformAuditLog[]; pagination: any } }> {
  const queryParams = new URLSearchParams();
  if (filters?.action) queryParams.append('action', filters.action);
  if (filters?.resourceType) queryParams.append('resourceType', filters.resourceType);
  if (filters?.resourceId) queryParams.append('resourceId', filters.resourceId);
  if (filters?.userId) queryParams.append('userId', filters.userId);
  if (filters?.startDate) queryParams.append('startDate', filters.startDate);
  if (filters?.endDate) queryParams.append('endDate', filters.endDate);
  if (filters?.page) queryParams.append('page', filters.page.toString());
  if (filters?.limit) queryParams.append('limit', filters.limit.toString());
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/platform/audit-logs?${queryString}` : '/platform/audit-logs';
  return apiClient.get(endpoint);
}

// ============================================
// TICKETS DE SOPORTE
// ============================================

export interface SupportTicket {
  id: string;
  tenantId: string | null;
  createdById: string | null;
  assignedToId: string | null;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  tenant?: { id: string; name: string; slug: string };
  createdBy?: { id: string; email: string; name: string | null };
  assignedTo?: { id: string; email: string; name: string | null };
  messages?: TicketMessage[];
  _count?: { messages: number };
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
}

export async function listSupportTickets(filters?: {
  status?: string;
  category?: string;
  priority?: string;
  assignedToId?: string;
  tenantId?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; data: { tickets: SupportTicket[]; pagination: any } }> {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.category) queryParams.append('category', filters.category);
  if (filters?.priority) queryParams.append('priority', filters.priority);
  if (filters?.assignedToId) queryParams.append('assignedToId', filters.assignedToId);
  if (filters?.tenantId) queryParams.append('tenantId', filters.tenantId);
  if (filters?.page) queryParams.append('page', filters.page.toString());
  if (filters?.limit) queryParams.append('limit', filters.limit.toString());
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/platform/support/tickets?${queryString}` : '/platform/support/tickets';
  return apiClient.get(endpoint);
}

export async function getSupportTicketDetails(ticketId: string): Promise<{ success: boolean; data: SupportTicket }> {
  return apiClient.get(`/platform/support/tickets/${ticketId}`);
}

export async function createSupportTicket(data: {
  tenantId?: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  assignedToId?: string;
}): Promise<{ success: boolean; data: SupportTicket }> {
  return apiClient.post('/platform/support/tickets', data);
}

export async function updateSupportTicket(
  ticketId: string,
  data: {
    subject?: string;
    description?: string;
    category?: string;
    priority?: string;
    status?: string;
    assignedToId?: string;
  },
): Promise<{ success: boolean; data: SupportTicket }> {
  return apiClient.put(`/platform/support/tickets/${ticketId}`, data);
}

export async function addTicketMessage(
  ticketId: string,
  data: { message: string; isInternal?: boolean },
): Promise<{ success: boolean; data: TicketMessage }> {
  return apiClient.post(`/platform/support/tickets/${ticketId}/messages`, data);
}

export async function closeSupportTicket(ticketId: string): Promise<{ success: boolean; data: SupportTicket }> {
  return apiClient.post(`/platform/support/tickets/${ticketId}/close`);
}

// ============================================
// CHAT EN VIVO
// ============================================

export interface PlatformChatMessage {
  id: string;
  tenantId: string;
  userId: string;
  message: string;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
  tenant?: { id: string; name: string; slug: string };
}

export async function listActiveChatConversations(): Promise<{ success: boolean; data: any[] }> {
  return apiClient.get('/platform/chat/conversations');
}

export async function getChatHistory(tenantId: string, limit?: number): Promise<{ success: boolean; data: PlatformChatMessage[] }> {
  const queryParams = new URLSearchParams();
  if (limit) queryParams.append('limit', limit.toString());
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/platform/chat/tenants/${tenantId}/history?${queryString}` : `/platform/chat/tenants/${tenantId}/history`;
  return apiClient.get(endpoint);
}

export async function sendChatMessage(tenantId: string, message: string): Promise<{ success: boolean; data: PlatformChatMessage }> {
  return apiClient.post(`/platform/chat/tenants/${tenantId}/messages`, { message });
}

// ============================================
// CRM DE LEADS
// ============================================

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: string;
  interest: string | null;
  status: string;
  stage: string;
  assignedToId: string | null;
  conversationId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; email: string; name: string | null };
  leadnotes?: LeadNote[];
  _count?: { leadnotes: number };
}

export interface LeadNote {
  id: string;
  leadId: string;
  userId: string;
  note: string;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
}

export async function listLeads(filters?: {
  status?: string;
  stage?: string;
  source?: string;
  assignedToId?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; data: { leads: Lead[]; pagination: any } }> {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.stage) queryParams.append('stage', filters.stage);
  if (filters?.source) queryParams.append('source', filters.source);
  if (filters?.assignedToId) queryParams.append('assignedToId', filters.assignedToId);
  if (filters?.page) queryParams.append('page', filters.page.toString());
  if (filters?.limit) queryParams.append('limit', filters.limit.toString());
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/platform/leads?${queryString}` : '/platform/leads';
  return apiClient.get(endpoint);
}

export async function getLeadPipeline(): Promise<{ success: boolean; data: { pipeline: any; metrics: any } }> {
  return apiClient.get('/platform/leads/pipeline');
}

export async function getSalesMetrics(): Promise<{ success: boolean; data: any }> {
  return apiClient.get('/platform/leads/metrics');
}

export async function getLeadDetails(leadId: string): Promise<{ success: boolean; data: Lead }> {
  return apiClient.get(`/platform/leads/${leadId}`);
}

export async function createLead(data: {
  name: string;
  email: string;
  phone?: string;
  source: string;
  interest?: string;
  notes?: string;
  conversationId?: string;
}): Promise<{ success: boolean; data: Lead }> {
  return apiClient.post('/platform/leads', data);
}

export async function updateLead(
  leadId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    interest?: string;
    status?: string;
    stage?: string;
    assignedToId?: string;
    notes?: string;
  },
): Promise<{ success: boolean; data: Lead }> {
  return apiClient.put(`/platform/leads/${leadId}`, data);
}

export async function addLeadNote(leadId: string, note: string): Promise<{ success: boolean; data: LeadNote }> {
  return apiClient.post(`/platform/leads/${leadId}/notes`, { note });
}

// ============================================
// MULTI-INSTANCIA
// ============================================

export interface PlatformInstance {
  id: string;
  name: string;
  domain: string;
  databaseUrl: string;
  stripeKey: string | null;
  n8nUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  tenants?: any[];
  _count?: { tenants: number };
}

export async function listInstances(): Promise<{ success: boolean; data: PlatformInstance[] }> {
  return apiClient.get('/platform/instances');
}

export async function getInstanceDetails(instanceId: string): Promise<{ success: boolean; data: PlatformInstance }> {
  return apiClient.get(`/platform/instances/${instanceId}`);
}

export async function createInstance(data: {
  name: string;
  domain: string;
  databaseUrl: string;
  stripeKey?: string;
  n8nUrl?: string;
  status?: string;
}): Promise<{ success: boolean; data: PlatformInstance }> {
  return apiClient.post('/platform/instances', data);
}

export async function updateInstance(
  instanceId: string,
  data: {
    name?: string;
    domain?: string;
    databaseUrl?: string;
    stripeKey?: string;
    n8nUrl?: string;
    status?: string;
  },
): Promise<{ success: boolean; data: PlatformInstance }> {
  return apiClient.put(`/platform/instances/${instanceId}`, data);
}

export async function assignTenantToInstance(instanceId: string, tenantId: string): Promise<{ success: boolean; data: any }> {
  return apiClient.post(`/platform/instances/${instanceId}/tenants/${tenantId}`);
}

export async function deleteInstance(instanceId: string): Promise<{ success: boolean; message: string }> {
  return apiClient.delete(`/platform/instances/${instanceId}`);
}

// ============================================
// FLUJOS N8N DE PLATAFORMA
// ============================================

export interface PlatformN8NFlow {
  id: string;
  name: string;
  description: string | null;
  workflow: any;
  category: string;
  isActive: boolean;
  n8nWorkflowId: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listPlatformN8NFlows(filters?: {
  category?: string;
  isActive?: boolean;
}): Promise<{ success: boolean; data: PlatformN8NFlow[] }> {
  const queryParams = new URLSearchParams();
  if (filters?.category) queryParams.append('category', filters.category);
  if (filters?.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/platform/n8n-flows?${queryString}` : '/platform/n8n-flows';
  return apiClient.get(endpoint);
}

export async function getPlatformN8NFlowDetails(flowId: string): Promise<{ success: boolean; data: PlatformN8NFlow }> {
  return apiClient.get(`/platform/n8n-flows/${flowId}`);
}

export async function createPlatformN8NFlow(data: {
  name: string;
  description?: string;
  workflow: any;
  category: string;
}): Promise<{ success: boolean; data: PlatformN8NFlow }> {
  return apiClient.post('/platform/n8n-flows', data);
}

export async function updatePlatformN8NFlow(
  flowId: string,
  data: {
    name?: string;
    description?: string;
    workflow?: any;
    category?: string;
    isActive?: boolean;
  },
): Promise<{ success: boolean; data: PlatformN8NFlow }> {
  return apiClient.put(`/platform/n8n-flows/${flowId}`, data);
}

export async function activatePlatformN8NFlow(flowId: string): Promise<{ success: boolean; data: PlatformN8NFlow }> {
  return apiClient.post(`/platform/n8n-flows/${flowId}/activate`);
}

export async function deactivatePlatformN8NFlow(flowId: string): Promise<{ success: boolean; data: PlatformN8NFlow }> {
  return apiClient.post(`/platform/n8n-flows/${flowId}/deactivate`);
}

export async function deletePlatformN8NFlow(flowId: string): Promise<{ success: boolean; message: string }> {
  return apiClient.delete(`/platform/n8n-flows/${flowId}`);
}

export async function getPlatformN8NFlowExecutionLogs(flowId: string, limit?: number): Promise<{ success: boolean; data: any }> {
  const queryParams = new URLSearchParams();
  if (limit) queryParams.append('limit', limit.toString());
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/platform/n8n-flows/${flowId}/executions?${queryString}` : `/platform/n8n-flows/${flowId}/executions`;
  return apiClient.get(endpoint);
}

// ============================================
// GESTIÓN AVANZADA DE PLANES
// ============================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  currency: string;
  priceCents: number;
  interval: 'MONTHLY' | 'YEARLY';
  maxAgents: number | null;
  maxChannels: number | null;
  createdAt: string;
  updatedAt: string;
  activeSubscriptions?: number;
  monthlyRevenue?: number;
  _count?: { tenantsubscription: number };
}

export async function listPlans(): Promise<{ success: boolean; data: SubscriptionPlan[] }> {
  return apiClient.get('/platform/plans');
}

export async function getPlanDetails(planId: string): Promise<{ success: boolean; data: SubscriptionPlan }> {
  return apiClient.get(`/platform/plans/${planId}`);
}

export async function getPlansMetrics(): Promise<{ success: boolean; data: any }> {
  return apiClient.get('/platform/plans/metrics');
}

export async function createPlan(data: {
  name: string;
  slug: string;
  description?: string;
  currency: string;
  priceCents: number;
  interval: 'MONTHLY' | 'YEARLY';
  maxAgents?: number;
  maxChannels?: number;
  maxMessages?: number;
}): Promise<{ success: boolean; data: SubscriptionPlan }> {
  return apiClient.post('/platform/plans', data);
}

export async function updatePlan(
  planId: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    currency?: string;
    priceCents?: number;
    interval?: 'MONTHLY' | 'YEARLY';
    maxAgents?: number;
    maxChannels?: number;
    maxMessages?: number;
  },
): Promise<{ success: boolean; data: SubscriptionPlan }> {
  return apiClient.put(`/platform/plans/${planId}`, data);
}

export async function deletePlan(planId: string): Promise<{ success: boolean; message: string }> {
  return apiClient.delete(`/platform/plans/${planId}`);
}

// ============================================
// OPERACIONES PROPIAS DEL PLATFORM_OWNER
// ============================================

/**
 * Obtiene agentes del PLATFORM_OWNER
 */
export async function getPlatformAgents(): Promise<{ success: boolean; data: Agent[] }> {
  return apiClient.get('/platform/operations/agents');
}

/**
 * Obtiene canales del PLATFORM_OWNER
 */
export async function getPlatformChannels(filters?: {
  type?: 'WHATSAPP' | 'VOICE' | 'WEBCHAT' | 'TELEGRAM';
  status?: 'ACTIVE' | 'INACTIVE' | 'ERROR';
}): Promise<{ success: boolean; data: Channel[] }> {
  const queryParams = new URLSearchParams();
  if (filters?.type) queryParams.append('type', filters.type);
  if (filters?.status) queryParams.append('status', filters.status);
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/platform/operations/channels?${queryString}` : '/platform/operations/channels';
  return apiClient.get(endpoint);
}

/**
 * Obtiene conversaciones del PLATFORM_OWNER
 */
export async function getPlatformConversations(filters?: {
  agentId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; data: any }> {
  const queryParams = new URLSearchParams();
  if (filters?.agentId) queryParams.append('agentId', filters.agentId);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.limit) queryParams.append('limit', filters.limit.toString());
  if (filters?.offset) queryParams.append('offset', filters.offset.toString());
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/platform/operations/conversations?${queryString}` : '/platform/operations/conversations';
  return apiClient.get(endpoint);
}

/**
 * Obtiene el tenant del PLATFORM_OWNER para operaciones propias
 */
export async function getPlatformTenant(): Promise<{ success: boolean; data: { tenantId: string } }> {
  return apiClient.get('/platform/operations/tenant');
}
