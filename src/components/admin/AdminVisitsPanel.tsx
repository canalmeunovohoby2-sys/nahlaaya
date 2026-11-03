import { useEffect, useState } from 'react'
import { getSupabaseVisitStats } from '../../services/supabase/admin'
import { backendMode } from '../../services/supabase/client'
import type { VisitStats } from '../../types/admin'

type VisitsState =
  | { status: 'pending' }
  | { status: 'loading' }
  | { status: 'ready'; stats: VisitStats }
  | { status: 'error' }

function isVisitStats(value: unknown): value is VisitStats {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const stats = value as Partial<VisitStats>

  return (
    Number.isFinite(stats.total) &&
    Number.isFinite(stats.today) &&
    Number.isFinite(stats.last7Days) &&
    typeof stats.timezone === 'string'
  )
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function AdminVisitsPanel() {
  const [state, setState] = useState<VisitsState>(
    backendMode === 'supabase' ? { status: 'loading' } : { status: 'pending' },
  )
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (backendMode !== 'supabase') {
      return
    }

    let active = true

    async function load() {
      try {
        const stats = await getSupabaseVisitStats()

        if (active) {
          setState(
            isVisitStats(stats)
              ? { status: 'ready', stats }
              : { status: 'error' },
          )
        }
      } catch {
        if (active) {
          setState({ status: 'error' })
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [reloadKey])

  return (
    <section className="admin-card admin-visits">
      <div className="admin-card__head">
        <div>
          <p className="admin-eyebrow">Audiência</p>
          <h2>Visitas da loja</h2>
          <p className="admin-card__hint">
            Acessos únicos por sessão de navegação.
          </p>
        </div>
      </div>

      {state.status === 'pending' ? (
        <div className="admin-visits__pending">
          <div>
            <strong>Integração pendente</strong>
            <p>
              O contador será ativado quando o Supabase estiver conectado. Nenhum
              número é exibido sem dados reais.
            </p>
          </div>
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <div className="admin-state">Carregando estatísticas de visitas...</div>
      ) : null}

      {state.status === 'error' ? (
        <div className="admin-state admin-state--error">
          <p>Não foi possível carregar as estatísticas de visitas.</p>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => {
              setState({ status: 'loading' })
              setReloadKey((current) => current + 1)
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {state.status === 'ready' ? (
        <>
          <div className="admin-visits__grid">
            <article className="admin-visit-stat">
              <span>Total acumulado</span>
              <strong>{formatCount(state.stats.total)}</strong>
              <small>Visitas únicas registradas</small>
            </article>
            <article className="admin-visit-stat">
              <span>Hoje</span>
              <strong>{formatCount(state.stats.today)}</strong>
              <small>Registros de hoje</small>
            </article>
            <article className="admin-visit-stat">
              <span>Últimos 7 dias</span>
              <strong>{formatCount(state.stats.last7Days)}</strong>
              <small>Hoje e os seis dias anteriores</small>
            </article>
          </div>
          <p className="admin-visits__note">
            Agrupamento diário no horário de Brasília. A contagem registra apenas
            acessos reais e não é um mecanismo para manter o Supabase ativo.
          </p>
        </>
      ) : null}
    </section>
  )
}
