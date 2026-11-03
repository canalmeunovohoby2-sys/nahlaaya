import { MinusIcon, PlusIcon } from '../icons/Icons'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label: string
  size?: 'default' | 'small'
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  size = 'default',
}: QuantityStepperProps) {
  return (
    <div
      className={`quantity${size === 'small' ? ' quantity--small' : ''}`}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Diminuir quantidade"
      >
        <MinusIcon width={16} height={16} />
      </button>
      <span className="quantity__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Aumentar quantidade"
      >
        <PlusIcon width={16} height={16} />
      </button>
    </div>
  )
}
