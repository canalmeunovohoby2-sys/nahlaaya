import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  disconnectMelhorEnvio,
  getMelhorEnvioStatus,
  startMelhorEnvioOAuth,
} from '../services/supabase/admin'
import { AdminApiError } from '../admin/errors'
import { usePageTitle } from '../hooks/usePageTitle'
import { ShippingSettingsCard } from '../components/admin/ShippingSettingsCard'
import type { MelhorEnvioStatus } from '../types/admin'

type LoadState = 'loading' | 'ready' | 'error'

function formatDate(value: string | null): string {
  if (!value) {
    return 'Não informado'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Não informado'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function AdminIntegrationsPage() {
  usePageTitle('Integrações')
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<MelhorEnvioStatus | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [actionError, setActionError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const callbackStatus = searchParams.get('melhor_envio')
  const callbackMessage = searchParams.get('message')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const nextStatus = await getMelhorEnvioStatus()

        if (active) {
          setStatus(nextStatus)
          setLoadState('ready')
        }
      } catch {
        if (active) {
          setLoadState('error')
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  async function handleConnect() {
    setStarting(true)
    setActionError(null)

    try {
      const authorizationUrl = await startMelhorEnvioOAuth()

      if (!authorizationUrl) {
        throw new Error('URL de autorização não retornada.')
      }

      window.location.assign(authorizationUrl)
    } catch (error) {
      setActionError(
        error instanceof AdminApiError || error instanceof Error
          ? error.message
          : 'Não foi possível iniciar a conexão.',
      )
      setStarting(false)
    }
  }

  async function handleDisconnect() {
    if (
      !window.confirm(
        'Desconectar a conta do Melhor Envio? A loja precisará de uma nova autorização para usar o frete.',
      )
    ) {
      return
    }

    setDisconnecting(true)
    setActionError(null)

    try {
      await disconnectMelhorEnvio()
      setStatus((current) =>
        current
          ? {
              ...current,
              connected: false,
              accountId: null,
              accountName: null,
              expiresAt: null,
              needsReconnect: false,
              connectedAt: null,
              scope: null,
            }
          : current,
      )
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Não foi possível desconectar a conta.',
      )
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <p className="admin-eyebrow">Operação</p>
          <h1>Integrações</h1>
          <p className="admin-page__lead">
            Conecte os serviços usados pela loja e acompanhe o estado da
            integração.
          </p>
        </div>
      </div>

      {callbackStatus === 'connected' ? (
        <div className="admin-state admin-integration-feedback">
          Conta do Melhor Envio conectada com sucesso.
        </div>
      ) : null}

      {callbackStatus === 'error' ? (
        <div className="admin-state admin-state--error admin-integration-feedback">
          Não foi possível concluir a conexão
          {callbackMessage ? `: ${callbackMessage}` : '.'}
        </div>
      ) : null}

      {actionError ? (
        <div className="admin-state admin-state--error">{actionError}</div>
      ) : null}

      <ShippingSettingsCard />

      {loadState === 'loading' ? (
        <div className="admin-state">Carregando integrações...</div>
      ) : null}

      {loadState === 'error' ? (
        <div className="admin-state admin-state--error">
          Não foi possível consultar o estado das integrações.
        </div>
      ) : null}

      {loadState === 'ready' && status ? (
        <section className="admin-card admin-integration-card">
          <div className="admin-card__head">
            <div>
              <p className="admin-eyebrow">Frete</p>
              <h2>Melhor Envio</h2>
              <p className="admin-card__hint">
                Autorize a conta que fará as cotações e, futuramente, a compra
                de etiquetas.
              </p>
            </div>
            <span
              className={`admin-integration-status ${
                status.connected
                  ? 'admin-integration-status--connected'
                  : ''
              }`}
            >
              {status.connected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>

          {status.connected ? (
            <div className="admin-integration-details">
              <dl>
                <div>
                  <dt>Conta</dt>
                  <dd>
                    {status.accountName ||
                      status.accountId ||
                      'Conta conectada'}
                  </dd>
                </div>
                <div>
                  <dt>Conectada em</dt>
                  <dd>{formatDate(status.connectedAt)}</dd>
                </div>
                <div>
                  <dt>Token válido até</dt>
                  <dd>{formatDate(status.expiresAt)}</dd>
                </div>
                <div>
                  <dt>Escopos</dt>
                  <dd>{status.scope || 'Não informados'}</dd>
                </div>
              </dl>

              {status.needsReconnect ? (
                <p className="admin-form-error">
                  A autorização precisa ser renovada. Conecte a conta
                  novamente.
                </p>
              ) : null}

              <div className="admin-integration-actions">
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? 'Desconectando...' : 'Desconectar'}
                </button>
                {status.needsReconnect ? (
                  <button
                    type="button"
                    className="btn btn--gold btn--sm"
                    onClick={handleConnect}
                    disabled={starting}
                  >
                    {starting ? 'Abrindo...' : 'Reconectar conta'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="admin-integration-disconnected">
              <p>
                Conecte a conta do Melhor Envio para habilitar a cotação de
                frete nas próximas etapas.
              </p>
              <button
                type="button"
                className="btn btn--gold btn--sm"
                onClick={handleConnect}
                disabled={starting}
              >
                {starting ? 'Abrindo Melhor Envio...' : 'Conectar conta'}
              </button>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
