import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  getShippingSettings,
  updateShippingSettings,
} from '../../services/supabase/admin'
import { AdminApiError } from '../../admin/errors'
import { estimatedPackagingFormValues } from '../../lib/shipping-defaults'

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.length > 5
    ? `${digits.slice(0, 5)}-${digits.slice(5)}`
    : digits
}

function optionalPositiveInteger(
  value: string,
  label: string,
): number | null {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value)

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(label + ' inválido.')
  }

  return parsed
}

function inputValue(value: number | null): string {
  return value ? String(value) : ''
}

export function ShippingSettingsCard() {
  const [originCep, setOriginCep] = useState('')
  const [perfumeWeightGrams, setPerfumeWeightGrams] = useState('')
  const [boxWeightGrams, setBoxWeightGrams] = useState('')
  const [boxLengthCm, setBoxLengthCm] = useState('')
  const [boxWidthCm, setBoxWidthCm] = useState('')
  const [boxHeightCm, setBoxHeightCm] = useState('')
  const [maxPerfumesPerBox, setMaxPerfumesPerBox] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [estimateApplied, setEstimateApplied] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const settings = await getShippingSettings()

        if (active) {
          setOriginCep(settings.originCep ? formatCep(settings.originCep) : '')
          setPerfumeWeightGrams(inputValue(settings.perfumeWeightGrams))
          setBoxWeightGrams(inputValue(settings.boxWeightGrams))
          setBoxLengthCm(inputValue(settings.boxLengthCm))
          setBoxWidthCm(inputValue(settings.boxWidthCm))
          setBoxHeightCm(inputValue(settings.boxHeightCm))
          setMaxPerfumesPerBox(inputValue(settings.maxPerfumesPerBox))
          setLoading(false)
        }
      } catch {
        if (active) {
          setError('Não foi possível carregar a configuração de envio.')
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  function applyEstimatedDefaults() {
    const values = estimatedPackagingFormValues()
    setPerfumeWeightGrams(values.perfumeWeightGrams)
    setBoxWeightGrams(values.boxWeightGrams)
    setBoxLengthCm(values.boxLengthCm)
    setBoxWidthCm(values.boxWidthCm)
    setBoxHeightCm(values.boxHeightCm)
    setMaxPerfumesPerBox(values.maxPerfumesPerBox)
    setEstimateApplied(true)
    setError(null)
    setSuccess(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const digits = originCep.replace(/\D/g, '')

    if (digits && digits.length !== 8) {
      setError('Informe um CEP com 8 dígitos.')
      setSuccess(null)
      return
    }

    let perfumeWeight: number | null
    let boxWeight: number | null
    let boxLength: number | null
    let boxWidth: number | null
    let boxHeight: number | null
    let maxPerBox: number | null

    try {
      perfumeWeight = optionalPositiveInteger(
        perfumeWeightGrams,
        'Peso do perfume',
      )
      boxWeight = optionalPositiveInteger(boxWeightGrams, 'Peso da caixa')
      boxLength = optionalPositiveInteger(boxLengthCm, 'Comprimento')
      boxWidth = optionalPositiveInteger(boxWidthCm, 'Largura')
      boxHeight = optionalPositiveInteger(boxHeightCm, 'Altura')
      maxPerBox = optionalPositiveInteger(
        maxPerfumesPerBox,
        'Máximo por caixa',
      )
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : 'Dados de embalagem inválidos.',
      )
      setSuccess(null)
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const settings = await updateShippingSettings({
        originCep: digits || null,
        perfumeWeightGrams: perfumeWeight,
        boxWeightGrams: boxWeight,
        boxLengthCm: boxLength,
        boxWidthCm: boxWidth,
        boxHeightCm: boxHeight,
        maxPerfumesPerBox: maxPerBox,
      })

      setOriginCep(settings.originCep ? formatCep(settings.originCep) : '')
      setPerfumeWeightGrams(inputValue(settings.perfumeWeightGrams))
      setBoxWeightGrams(inputValue(settings.boxWeightGrams))
      setBoxLengthCm(inputValue(settings.boxLengthCm))
      setBoxWidthCm(inputValue(settings.boxWidthCm))
      setBoxHeightCm(inputValue(settings.boxHeightCm))
      setMaxPerfumesPerBox(inputValue(settings.maxPerfumesPerBox))
      setSuccess('Configuração de envio atualizada.')
    } catch (saveError) {
      setError(
        saveError instanceof AdminApiError
          ? saveError.message
          : 'Não foi possível salvar a configuração de envio.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-card admin-shipping-settings">
      <div className="admin-card__head">
        <div>
          <p className="admin-eyebrow">Frete</p>
          <h2>Origem dos envios</h2>
          <p className="admin-card__hint">
            Informe o CEP de postagem e a embalagem padrão usada pela loja.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="admin-state">Carregando configuração...</div>
      ) : (
        <form className="admin-shipping-settings__form" onSubmit={handleSubmit}>
          <div className="admin-field admin-shipping-settings__field">
            <label htmlFor="shipping-origin-cep">CEP de origem</label>
            <input
              id="shipping-origin-cep"
              inputMode="numeric"
              value={originCep}
              onChange={(event) => setOriginCep(formatCep(event.target.value))}
              placeholder="00000-000"
              maxLength={9}
            />
          </div>

          <div className="admin-shipping-settings__section">
            <h3>Padrão estimado de embalagem — Perfumes</h3>
            <p className="admin-card__hint">
              Medidas externas da caixa de envio, não o volume em ml do
              perfume. Produtos com peso e as quatro dimensões próprios
              preenchidos usam embalagem individual; os demais usam este padrão.
            </p>

            <div className="admin-shipping-settings__estimate">
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={applyEstimatedDefaults}
              >
                Aplicar padrão estimado
              </button>
              <p className="admin-shipping-settings__warning">
                Valores estimados. Confira o peso e as dimensões de uma
                embalagem real antes de ativar cotações em produção.
              </p>
              {estimateApplied ? (
                <p className="admin-row-feedback">
                  Valores aplicados ao formulário. Revise os números e salve a
                  configuração para confirmar.
                </p>
              ) : null}
            </div>

            <div className="admin-shipping-settings__grid">
              <div className="admin-field">
                <label htmlFor="shipping-perfume-weight">
                  Peso do perfume embalado (g)
                </label>
                <input
                  id="shipping-perfume-weight"
                  type="number"
                  min="1"
                  step="1"
                  value={perfumeWeightGrams}
                  onChange={(event) =>
                    setPerfumeWeightGrams(event.target.value)
                  }
                  placeholder="Ex.: 500"
                />
              </div>

              <div className="admin-field">
                <label htmlFor="shipping-box-weight">
                  Peso adicional da caixa (g)
                </label>
                <input
                  id="shipping-box-weight"
                  type="number"
                  min="1"
                  step="1"
                  value={boxWeightGrams}
                  onChange={(event) => setBoxWeightGrams(event.target.value)}
                  placeholder="Ex.: 200"
                />
              </div>

              <div className="admin-field">
                <label htmlFor="shipping-box-length">
                  Comprimento externo (cm)
                </label>
                <input
                  id="shipping-box-length"
                  type="number"
                  min="1"
                  step="1"
                  value={boxLengthCm}
                  onChange={(event) => setBoxLengthCm(event.target.value)}
                  placeholder="Ex.: 30"
                />
              </div>

              <div className="admin-field">
                <label htmlFor="shipping-box-width">
                  Largura externa (cm)
                </label>
                <input
                  id="shipping-box-width"
                  type="number"
                  min="1"
                  step="1"
                  value={boxWidthCm}
                  onChange={(event) => setBoxWidthCm(event.target.value)}
                  placeholder="Ex.: 20"
                />
              </div>

              <div className="admin-field">
                <label htmlFor="shipping-box-height">
                  Altura externa (cm)
                </label>
                <input
                  id="shipping-box-height"
                  type="number"
                  min="1"
                  step="1"
                  value={boxHeightCm}
                  onChange={(event) => setBoxHeightCm(event.target.value)}
                  placeholder="Ex.: 15"
                />
              </div>

              <div className="admin-field">
                <label htmlFor="shipping-max-per-box">
                  Máximo de perfumes por caixa
                </label>
                <input
                  id="shipping-max-per-box"
                  type="number"
                  min="1"
                  step="1"
                  value={maxPerfumesPerBox}
                  onChange={(event) => setMaxPerfumesPerBox(event.target.value)}
                  placeholder="Ex.: 5"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn--gold btn--sm"
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar configuração'}
          </button>
        </form>
      )}

      {error ? (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      ) : null}

      {success ? <p className="admin-row-feedback">{success}</p> : null}
    </section>
  )
}
