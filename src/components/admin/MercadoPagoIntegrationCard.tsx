import { useEffect, useState } from 'react'
import { AdminApiError } from '../../admin/errors'
import { supabaseUrl } from '../../services/supabase/client'
import {
  getMercadoPagoSettings,
  updateMercadoPagoSettings,
  validateMercadoPagoSettings,
} from '../../services/supabase/admin'
import type {
  MercadoPagoCredentialStatus,
  MercadoPagoSettings,
} from '../../types/admin'

const labels: Record<MercadoPagoCredentialStatus, string> = {
  awaiting_credentials: 'Aguardando credenciais',
  incomplete: 'Configuração incompleta',
  configured: 'Credenciais cadastradas',
  validated: 'Access Token validado',
  error: 'Erro na validação',
}

function statusClass(status: MercadoPagoCredentialStatus): string {
  if (status === 'validated') {
    return 'admin-integration-status admin-integration-status--connected'
  }

  if (status === 'error') {
    return 'admin-integration-status admin-integration-status--error'
  }

  return 'admin-integration-status admin-integration-status--pending'
}

export function MercadoPagoIntegrationCard() {
  const [settings, setSettings] = useState<MercadoPagoSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [publicKey, setPublicKey] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const next = await getMercadoPagoSettings()

        if (active) {
          setSettings(next)
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Não foi possível consultar a integração.',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  async function refresh() {
    const next = await getMercadoPagoSettings()
    setSettings(next)
    return next
  }

  async function handleSave() {
    const input = {
      ...(publicKey.trim() ? { publicKey: publicKey.trim() } : {}),
      ...(accessToken.trim() ? { accessToken: accessToken.trim() } : {}),
      ...(webhookSecret.trim() ? { webhookSecret: webhookSecret.trim() } : {}),
    }

    if (Object.keys(input).length === 0) {
      setError('Informe ao menos uma credencial para salvar.')
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const next = await updateMercadoPagoSettings(input)
      setSettings(next)
      setPublicKey('')
      setAccessToken('')
      setWebhookSecret('')
      setMessage('Credenciais armazenadas com segurança no backend.')
    } catch (saveError) {
      setError(
        saveError instanceof AdminApiError || saveError instanceof Error
          ? saveError.message
          : 'Não foi possível salvar as credenciais.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleValidate() {
    setValidating(true)
    setError(null)
    setMessage(null)

    try {
      const next = await validateMercadoPagoSettings()
      setSettings(next)
      setMessage(next.validationMessage ?? 'Configuração verificada.')
    } catch (validateError) {
      setError(
        validateError instanceof AdminApiError || validateError instanceof Error
          ? validateError.message
          : 'Não foi possível validar a configuração.',
      )

      try {
        await refresh()
      } catch {
        // Mantém a última informação conhecida em caso de falha de rede.
      }
    } finally {
      setValidating(false)
    }
  }

  const allConfigured = Boolean(
    settings?.publicKeyConfigured &&
      settings.accessTokenConfigured &&
      settings.webhookSecretConfigured,
  )
  const webhookUrl =
    settings?.webhookUrl ??
    (supabaseUrl ? `${supabaseUrl}/functions/v1/mercadopago-webhook` : null)

  return (
    <section className="admin-card admin-integration-card">
      <div className="admin-card__head">
        <div>
          <p className="admin-eyebrow">Pagamentos</p>
          <h2>Mercado Pago</h2>
          <p className="admin-card__hint">
            Cadastre as credenciais da conta para preparar Pix e cartões com
            segurança. Nenhuma cobrança é feita nesta tela.
          </p>
        </div>
        <span className={statusClass(settings?.status ?? 'awaiting_credentials')}>
          {labels[settings?.status ?? 'awaiting_credentials']}
        </span>
      </div>

      {loading ? (
        <p className="admin-card__hint">Consultando configuração...</p>
      ) : null}

      {!loading && settings && !settings.encryptionKeyConfigured ? (
        <div className="admin-state admin-state--error">
          A chave mestra de criptografia não está configurada no Supabase. O
          salvamento e a validação ficam bloqueados até configurar{' '}
          <code>MERCADO_PAGO_ENCRYPTION_KEY</code>.
        </div>
      ) : null}

      <div className="admin-mercado-pago-fields">
        <div className="admin-field">
          <label htmlFor="mercadopago-public-key">Public Key</label>
          <input
            id="mercadopago-public-key"
            value={publicKey}
            onChange={(event) => setPublicKey(event.target.value)}
            placeholder={
              settings?.publicKeyConfigured
                ? 'Configurado — informe apenas para substituir'
                : 'Cole a Public Key'
            }
            autoComplete="off"
            spellCheck={false}
          />
          <span className="admin-field__status">
            {settings?.publicKeyConfigured ? 'Configurado' : 'Pendente'}
          </span>
        </div>

        <div className="admin-field">
          <label htmlFor="mercadopago-access-token">Access Token</label>
          <input
            id="mercadopago-access-token"
            type="password"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            placeholder={
              settings?.accessTokenConfigured
                ? 'Configurado — informe apenas para substituir'
                : 'Cole o Access Token'
            }
            autoComplete="new-password"
            spellCheck={false}
          />
          <span className="admin-field__status">
            {settings?.accessTokenConfigured ? 'Configurado' : 'Pendente'}
          </span>
        </div>

        <div className="admin-field">
          <label htmlFor="mercadopago-webhook-secret">Webhook Secret</label>
          <input
            id="mercadopago-webhook-secret"
            type="password"
            value={webhookSecret}
            onChange={(event) => setWebhookSecret(event.target.value)}
            placeholder={
              settings?.webhookSecretConfigured
                ? 'Configurado — informe apenas para substituir'
                : 'Cole o Webhook Secret'
            }
            autoComplete="new-password"
            spellCheck={false}
          />
          <span className="admin-field__status">
            {settings?.webhookSecretConfigured ? 'Configurado' : 'Pendente'}
          </span>
        </div>
      </div>

      <div className="admin-mercado-pago-webhook">
        <p className="admin-eyebrow">URL do webhook</p>
        <code>{webhookUrl ?? 'Indisponível até configurar o Supabase.'}</code>
        <p className="admin-card__hint">
          Cadastre esta URL no painel do Mercado Pago e use o mesmo Webhook
          Secret informado acima.
        </p>
      </div>

      {message ? <div className="admin-state">{message}</div> : null}
      {error ? (
        <div className="admin-state admin-state--error">{error}</div>
      ) : null}

      <div className="admin-integration-actions">
        <button
          type="button"
          className="btn btn--gold btn--sm"
          onClick={() => void handleSave()}
          disabled={saving || !settings?.encryptionKeyConfigured}
        >
          {saving
            ? 'Salvando...'
            : settings?.status === 'awaiting_credentials'
              ? 'Salvar configuração'
              : 'Atualizar credenciais'}
        </button>

        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={() => void handleValidate()}
          disabled={validating || !allConfigured || !settings?.encryptionKeyConfigured}
        >
          {validating ? 'Verificando...' : 'Verificar configuração'}
        </button>
      </div>
    </section>
  )
}
