package com.apibot.features.approval.config

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Configuração do aviso externo de checkpoint (n8n → Teams — ver .specs/001-aprovacoes-externas-teams).
 * `notifyConnectTimeoutSeconds`/`notifyReadTimeoutSeconds` mantêm o envio fora do caminho crítico do run —
 * nunca aumentar sem revisar o NFR "nunca bloqueia o run" da spec.
 */
@ConfigurationProperties(prefix = "app.approval")
data class ApprovalProperties(
    /** Base do link de decisão enviado no aviso — `{base}/{approvalId}`. */
    val decisionBaseUrl: String = "http://localhost:5173/dashboard/aprovacoes",
    val notifyConnectTimeoutSeconds: Long = 3,
    val notifyReadTimeoutSeconds: Long = 5,
    /** Teto de caracteres do `summary` embutido no payload — nunca o artefato completo do run. */
    val summaryMaxChars: Int = 500,
    /**
     * Teto de itens decidíveis por pedido (design D15). Sem ele, um agente em loop geraria um payload
     * arbitrariamente grande e o timeout curto do webhook viraria um `notifyError` silencioso.
     */
    val itemsMaxCount: Int = 200,
)
