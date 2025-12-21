# Script para corregir errores de Prisma en el código
# Corrige nombres de modelos y enums para que coincidan con el schema

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$files = Get-ChildItem -Path "$scriptPath\src" -Recurse -Filter "*.ts" | Where-Object { $_.FullName -notmatch "node_modules|dist" }

Write-Host "Corrigiendo errores de Prisma en $($files.Count) archivos..." -ForegroundColor Cyan

$replacements = @{
    # Imports de enums
    'import \{ TenantRole(?:,|\s+from)'            = 'import { $Enums }'
    'import \{ TenantStatus(?:,|\s+from)'          = 'import { $Enums }'
    'import \{ SubscriptionStatus(?:,|\s+from)'    = 'import { $Enums }'
    'import \{ AgentStatus(?:,|\s+from)'           = 'import { $Enums }'
    'import \{ AppointmentStatus(?:,|\s+from)'     = 'import { $Enums }'
    'import \{ ChannelType(?:,|\s+from)'           = 'import { $Enums }'
    'import \{ ChannelStatus(?:,|\s+from)'         = 'import { $Enums }'
    'import \{ ConversationStatus(?:,|\s+from)'    = 'import { $Enums }'
    'import \{ MessageType(?:,|\s+from)'           = 'import { $Enums }'
    'import \{ MessageDirection(?:,|\s+from)'      = 'import { $Enums }'
    'import \{ MessageStatus(?:,|\s+from)'         = 'import { $Enums }'
    'import \{ InvitationStatus(?:,|\s+from)'      = 'import { $Enums }'
    'import \{ KnowledgeSourceType(?:,|\s+from)'   = 'import { $Enums }'
    'import \{ N8nFlowType(?:,|\s+from)'           = 'import { $Enums }'
    'import \{ CalendarProvider(?:,|\s+from)'      = 'import { $Enums }'
    'import \{ WhatsAppProvider(?:,|\s+from)'      = 'import { $Enums }'
    'import \{ WhatsAppAccountStatus(?:,|\s+from)' = 'import { $Enums }'
    
    # Nombres de modelos Prisma (camelCase -> lowercase)
    'prisma\.tenantMembership'                     = 'prisma.tenantmembership'
    'prisma\.tenantSettings'                       = 'prisma.tenantsettings'
    'prisma\.tenantSubscription'                   = 'prisma.tenantsubscription'
    'prisma\.tenantWhatsAppAccount'                = 'prisma.tenantwhatsappaccount'
    'prisma\.userIdentity'                         = 'prisma.useridentity'
    'prisma\.emailVerification'                    = 'prisma.emailverification'
    'prisma\.teamInvitation'                       = 'prisma.teaminvitation'
    'prisma\.knowledgeCollection'                  = 'prisma.knowledgecollection'
    'prisma\.knowledgeSource'                      = 'prisma.knowledgesource'
    'prisma\.knowledgeChunk'                       = 'prisma.knowledgechunk'
    'prisma\.calendarIntegration'                  = 'prisma.calendarintegration'
    'prisma\.agentCalendarRule'                    = 'prisma.agentcalendarrule'
    'prisma\.channelAgent'                         = 'prisma.channelagent'
    'prisma\.marketingLead'                        = 'prisma.marketinglead'
    'prisma\.roiEstimate'                          = 'prisma.roiestimate'
    'prisma\.n8nFlow'                              = 'prisma.n8nflow'
    'prisma\.consentLog'                           = 'prisma.consentlog'
    'prisma\.dataRetentionPolicy'                  = 'prisma.dataretentionpolicy'
    'prisma\.subscriptionPlan'                     = 'prisma.subscriptionplan'
    
    # Enums
    '\$Enums\.TenantRole'                          = '$Enums.tenantmembership_role'
    '\$Enums\.TenantStatus'                        = '$Enums.tenant_status'
    '\$Enums\.SubscriptionStatus'                  = '$Enums.tenantsubscription_status'
    '\$Enums\.AgentStatus'                         = '$Enums.agent_status'
    '\$Enums\.AppointmentStatus'                   = '$Enums.appointment_status'
    '\$Enums\.ChannelType'                         = '$Enums.channel_type'
    '\$Enums\.ChannelStatus'                       = '$Enums.channel_status'
    '\$Enums\.ConversationStatus'                  = '$Enums.conversation_status'
    '\$Enums\.MessageType'                         = '$Enums.message_type'
    '\$Enums\.MessageDirection'                    = '$Enums.message_direction'
    '\$Enums\.MessageStatus'                       = '$Enums.message_status'
    '\$Enums\.InvitationStatus'                    = '$Enums.teaminvitation_status'
    '\$Enums\.KnowledgeSourceType'                 = '$Enums.knowledgesource_type'
    '\$Enums\.N8nFlowType'                         = '$Enums.n8nflow_type'
    '\$Enums\.CalendarProvider'                    = '$Enums.calendarintegration_provider'
    '\$Enums\.WhatsAppProvider'                    = '$Enums.tenantwhatsappaccount_provider'
    '\$Enums\.WhatsAppAccountStatus'               = '$Enums.tenantwhatsappaccount_status'
    '\$Enums\.LanguageStrategy'                    = '$Enums.agent_languageStrategy'
    
    # Relaciones en includes
    'memberships:'                                 = 'tenantmembership:'
    'messages:'                                    = 'message:'
    'channelAgents:'                               = 'channelagent:'
    'calendarRules:'                               = 'agentcalendarrule:'
    'whatsappAccount:'                             = 'tenantwhatsappaccount:'
    
    # Acceso a relaciones
    '\.memberships'                                = '.tenantmembership'
    '\.messages'                                   = '.message'
    '\.channelAgents'                              = '.channelagent'
    '\.calendarRules'                              = '.agentcalendarrule'
    '\.whatsappAccount'                            = '.tenantwhatsappaccount'
    
    # Enums directos (sin $Enums)
    'TenantRole\.'                                 = '$Enums.tenantmembership_role.'
    'TenantStatus\.'                               = '$Enums.tenant_status.'
    'SubscriptionStatus\.'                         = '$Enums.tenantsubscription_status.'
    'AgentStatus\.'                                = '$Enums.agent_status.'
    'AppointmentStatus\.'                          = '$Enums.appointment_status.'
    'ChannelType\.'                                = '$Enums.channel_type.'
    'ChannelStatus\.'                              = '$Enums.channel_status.'
    'ConversationStatus\.'                         = '$Enums.conversation_status.'
    'MessageType\.'                                = '$Enums.message_type.'
    'MessageDirection\.'                           = '$Enums.message_direction.'
    'MessageStatus\.'                              = '$Enums.message_status.'
    'InvitationStatus\.'                           = '$Enums.teaminvitation_status.'
    'KnowledgeSourceType\.'                        = '$Enums.knowledgesource_type.'
    'N8nFlowType\.'                                = '$Enums.n8nflow_type.'
    'CalendarProvider\.'                           = '$Enums.calendarintegration_provider.'
    'WhatsAppProvider\.'                           = '$Enums.tenantwhatsappaccount_provider.'
    'WhatsAppAccountStatus\.'                      = '$Enums.tenantwhatsappaccount_status.'
}

$totalReplacements = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileReplacements = 0
    
    foreach ($pattern in $replacements.Keys) {
        $replacement = $replacements[$pattern]
        $newContent = $content -replace $pattern, $replacement
        if ($newContent -ne $content) {
            $count = ([regex]::Matches($content, $pattern)).Count
            $fileReplacements += $count
            $content = $newContent
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "✅ $($file.Name): $fileReplacements reemplazos" -ForegroundColor Green
        $totalReplacements += $fileReplacements
    }
}

Write-Host "`n✅ Total: $totalReplacements reemplazos en $($files.Count) archivos" -ForegroundColor Cyan

