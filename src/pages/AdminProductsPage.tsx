import { useEffect, useState } from 'react'
import { useAdminAuth } from '../admin/admin-auth-context'
import {
  AdminApiError,
  deleteProduct,
  getProducts,
  updateProduct,
} from '../admin/api'
import { AdminProductEditor } from '../components/admin/AdminProductEditor'
import { ProductImage } from '../components/ui/ProductImage'
import { formatCents } from '../admin/format'
import { usePageTitle } from '../hooks/usePageTitle'
import { backendMode } from '../services/supabase/client'
import type { AdminProduct } from '../types/admin'

interface ProductRowProps {
  product: AdminProduct
  csrfToken: string | null
  onUpdated: (product: AdminProduct) => void
  onEdit: (product: AdminProduct) => void
  onDelete: (product: AdminProduct) => void
}

function AdminProductRow({
  product,
  csrfToken,
  onUpdated,
  onEdit,
  onDelete,
}: ProductRowProps) {
  const [stock, setStock] = useState(String(product.stock))
  const [active, setActive] = useState(product.active)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function handleSave() {
    if (!csrfToken) {
      setFeedback('Sessão inválida. Recarregue o painel.')
      return
    }

    const parsedStock = Number(stock)

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setFeedback('Estoque inválido.')
      return
    }

    setSaving(true)
    setFeedback(null)

    try {
      const updated = await updateProduct(
        product.id,
        { stock: parsedStock, active },
        csrfToken,
      )
      onUpdated(updated)
      setStock(String(updated.stock))
      setActive(updated.active)
      setFeedback('Salvo')
    } catch (error) {
      setFeedback(
        error instanceof AdminApiError
          ? error.message
          : 'Não foi possível salvar.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td>
        <div className="admin-product-cell">
          <ProductImage
            src={product.images[0]}
            alt={product.name}
            className="admin-product-thumb"
          />
          <div>
            <strong>{product.name}</strong>
            <span className="admin-table__sub">
              {product.brand} · {product.volumeMl} ml · {product.concentration}
              {product.category === 'masculino'
                ? ' · Masculino'
                : product.category === 'feminino'
                  ? ' · Feminino'
                  : ' · Sem categoria'}
            </span>
            {product.description ? (
              <span className="admin-table__sub admin-product-description">
                {product.description}
              </span>
            ) : null}
          </div>
        </div>
      </td>
      <td>{formatCents(product.pixPriceCents)}</td>
      <td>{formatCents(product.debitPriceCents)}</td>
      <td>{formatCents(product.installmentTotalCents)}</td>
      <td>
        <input
          className="admin-stock-input"
          type="number"
          min="0"
          step="1"
          value={stock}
          onChange={(event) => setStock(event.target.value)}
          aria-label={`Estoque de ${product.name}`}
        />
      </td>
      <td>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          <span>{active ? 'Ativo' : 'Inativo'}</span>
        </label>
      </td>
      <td>
        <div className="admin-product-actions">
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          {backendMode === 'supabase' ? (
            <>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => onEdit(product)}
              >
                Editar
              </button>
              <button
                type="button"
                className="btn btn--outline btn--sm admin-product-delete"
                onClick={() => onDelete(product)}
              >
                Excluir
              </button>
            </>
          ) : null}
        </div>
        {feedback ? <span className="admin-row-feedback">{feedback}</span> : null}
      </td>
    </tr>
  )
}

export function AdminProductsPage() {
  usePageTitle('Produtos e estoque')
  const { csrfToken } = useAdminAuth()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState<AdminProduct | 'new' | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const data = await getProducts()
        if (active) {
          setProducts(data)
          setError(null)
        }
      } catch {
        if (active) {
          setError('Não foi possível carregar os produtos.')
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

  function replaceProduct(updated: AdminProduct) {
    setProducts((current) =>
      current.map((product) => (product.id === updated.id ? updated : product)),
    )
  }

  function handleSaved(saved: AdminProduct) {
    setProducts((current) => {
      const exists = current.some((product) => product.id === saved.id)

      if (!exists) {
        return [...current, saved].sort((a, b) =>
          a.name.localeCompare(b.name, 'pt-BR'),
        )
      }

      return current.map((product) =>
        product.id === saved.id ? saved : product,
      )
    })
    setEditor(null)
  }

  async function handleDelete(product: AdminProduct) {
    if (
      !window.confirm(
        `Excluir "${product.name}"? Essa ação não pode ser desfeita.`,
      )
    ) {
      return
    }

    try {
      await deleteProduct(product.id)
      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      )
      if (typeof editor === 'object' && editor?.id === product.id) {
        setEditor(null)
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof AdminApiError
          ? deleteError.message
          : 'Não foi possível excluir o produto.',
      )
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <p className="admin-eyebrow">Catálogo</p>
          <h1>Produtos e estoque</h1>
          <p className="admin-page__lead">
            {products.length} produtos cadastrados. Atualize disponibilidade,
            estoque e informações do catálogo.
          </p>
        </div>
        {backendMode === 'supabase' ? (
          <button
            type="button"
            className="btn btn--gold btn--sm"
            onClick={() => setEditor('new')}
          >
            Cadastrar produto
          </button>
        ) : null}
      </div>

      {editor ? (
        <AdminProductEditor
          key={editor === 'new' ? 'new' : editor.id}
          product={editor === 'new' ? undefined : editor}
          onCancel={() => setEditor(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {loading ? <div className="admin-state">Carregando produtos...</div> : null}
      {error ? <div className="admin-state admin-state--error">{error}</div> : null}

      {!loading && !error ? (
        <section className="admin-card">
          <div className="admin-card__head">
            <div>
              <h2>Catálogo</h2>
              <p className="admin-card__hint">
                Preços são calculados no servidor. Alterações de imagem são
                enviadas para o armazenamento seguro do Supabase.
              </p>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table admin-table--products">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Pix</th>
                  <th>Débito</th>
                  <th>3x</th>
                  <th>Estoque</th>
                  <th>Disponibilidade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <AdminProductRow
                    key={product.id}
                    product={product}
                    csrfToken={csrfToken}
                    onUpdated={replaceProduct}
                    onEdit={setEditor}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
