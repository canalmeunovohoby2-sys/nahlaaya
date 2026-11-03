import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  AdminApiError,
  createProduct,
  updateProductDetails,
} from '../../admin/api'
import { prepareProductImage } from '../../lib/product-image'
import type { PreparedProductImage } from '../../lib/product-image'
import type { AdminProduct } from '../../types/admin'

interface AdminProductEditorProps {
  product?: AdminProduct
  onCancel: () => void
  onSaved: (product: AdminProduct) => void
}

function priceInputValue(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

function parsePriceCents(value: string): number {
  const normalized = value.includes(',')
    ? value.replace(/\./g, '').replace(',', '.')
    : value

  return Math.round(Number(normalized) * 100)
}

export function AdminProductEditor({
  product,
  onCancel,
  onSaved,
}: AdminProductEditorProps) {
  const [name, setName] = useState(product?.name ?? '')
  const [brand, setBrand] = useState(product?.brand ?? '')
  const [volumeMl, setVolumeMl] = useState(String(product?.volumeMl ?? 100))
  const [concentration, setConcentration] = useState(
    product?.concentration ?? 'EDP',
  )
  const [category, setCategory] = useState<
    'masculino' | 'feminino' | ''
  >(
    product?.category === 'masculino' || product?.category === 'feminino'
      ? product.category
      : '',
  )
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(
    product ? priceInputValue(product.installmentTotalCents) : '',
  )
  const [stock, setStock] = useState(String(product?.stock ?? 0))
  const [active, setActive] = useState(product?.active ?? true)
  const [image, setImage] = useState<PreparedProductImage | null>(null)
  const [preview, setPreview] = useState(product?.images[0] ?? '')
  const [processingImage, setProcessingImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleImageChange(file: File | undefined) {
    if (!file) {
      return
    }

    setProcessingImage(true)
    setError(null)

    try {
      const prepared = await prepareProductImage(file)
      setImage(prepared)
      setPreview(prepared.previewUrl)
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : 'Não foi possível processar a imagem.',
      )
    } finally {
      setProcessingImage(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const volumeValue = Number(volumeMl)
    const stockValue = Number(stock)
    const priceCents = parsePriceCents(price.trim())

    if (!name.trim() || !brand.trim() || !concentration.trim()) {
      setError('Preencha nome, marca e concentração.')
      return
    }

    if (!category) {
      setError('Selecione a categoria do perfume.')
      return
    }

    if (!Number.isInteger(volumeValue) || volumeValue <= 0) {
      setError('Informe um volume válido em ml.')
      return
    }

    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      setError('Informe um preço válido.')
      return
    }

    if (!Number.isInteger(stockValue) || stockValue < 0) {
      setError('Informe um estoque válido.')
      return
    }

    if (!product && !image) {
      setError('Selecione uma imagem para o novo produto.')
      return
    }

    setSaving(true)
    setError(null)

    const input = {
      name: name.trim(),
      brand: brand.trim(),
      volumeMl: volumeValue,
      concentration: concentration.trim(),
      description: description.trim(),
      category,
      priceCents,
      stock: stockValue,
      active,
      image: image
        ? { base64: image.base64, contentType: image.contentType }
        : null,
    }

    try {
      const saved = product
        ? await updateProductDetails(product.id, input)
        : await createProduct(input)
      onSaved(saved)
    } catch (saveError) {
      setError(
        saveError instanceof AdminApiError
          ? saveError.message
          : 'Não foi possível salvar o produto.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-card admin-product-editor">
      <div className="admin-card__head">
        <div>
          <p className="admin-eyebrow">Catálogo</p>
          <h2>{product ? 'Editar produto' : 'Cadastrar produto'}</h2>
          <p className="admin-card__hint">
            O Pix, o débito e o parcelamento em 3x são calculados
            automaticamente a partir do preço informado.
          </p>
        </div>
        <button type="button" className="btn btn--outline btn--sm" onClick={onCancel}>
          Cancelar
        </button>
      </div>

      <form className="admin-product-form" onSubmit={handleSubmit}>
        <div className="admin-product-form__grid">
          <div className="admin-field admin-product-form__wide">
            <label htmlFor="product-name">Nome do produto</label>
            <input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="admin-field">
            <label htmlFor="product-brand">Marca</label>
            <input
              id="product-brand"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              required
            />
          </div>

          <div className="admin-field">
            <label htmlFor="product-volume">Volume (ml)</label>
            <input
              id="product-volume"
              type="number"
              min="1"
              step="1"
              value={volumeMl}
              onChange={(event) => setVolumeMl(event.target.value)}
              required
            />
          </div>

          <div className="admin-field">
            <label htmlFor="product-concentration">Concentração</label>
            <input
              id="product-concentration"
              value={concentration}
              onChange={(event) => setConcentration(event.target.value)}
              placeholder="EDP, EDT, Extrait de Parfum..."
              required
            />
          </div>

          <div className="admin-field">
            <label htmlFor="product-category">Categoria do perfume</label>
            <select
              id="product-category"
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value === 'masculino' ||
                    event.target.value === 'feminino'
                    ? event.target.value
                    : '',
                )
              }
              required
            >
              <option value="">Selecione</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
            </select>
          </div>

          <div className="admin-field">
            <label htmlFor="product-price">Preço principal</label>
            <input
              id="product-price"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="350,00"
              required
            />
          </div>

          <div className="admin-field">
            <label htmlFor="product-stock">Estoque</label>
            <input
              id="product-stock"
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(event) => setStock(event.target.value)}
              required
            />
          </div>

          <div className="admin-field admin-product-form__wide">
            <label htmlFor="product-description">Descrição</label>
            <textarea
              id="product-description"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descrição comercial do perfume"
            />
          </div>

          <div className="admin-field admin-product-form__wide">
            <label htmlFor="product-image">Imagem do produto</label>
            <input
              id="product-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                void handleImageChange(event.target.files?.[0])
              }
            />
            <span className="admin-product-form__hint">
              JPG, PNG ou WebP. A imagem é otimizada antes do envio.
            </span>
          </div>
        </div>

        {preview ? (
          <div className="admin-product-form__preview">
            <img src={preview} alt="" />
            <span>{image ? 'Nova imagem selecionada' : 'Imagem atual'}</span>
          </div>
        ) : null}

        <label className="admin-checkbox admin-product-form__active">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          <span>Produto ativo na loja</span>
        </label>

        {error ? (
          <p className="admin-form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="admin-product-form__actions">
          <button
            type="submit"
            className="btn btn--gold btn--sm"
            disabled={saving || processingImage}
          >
            {saving ? 'Salvando...' : product ? 'Salvar alterações' : 'Cadastrar produto'}
          </button>
        </div>
      </form>
    </section>
  )
}
