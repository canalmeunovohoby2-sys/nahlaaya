import type { InputHTMLAttributes } from 'react'

interface CheckoutFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  placeholder?: string
  autoComplete?: string
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  maxLength?: number
  fullWidth?: boolean
  required?: boolean
}

export function CheckoutField({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
  fullWidth = false,
  required = true,
}: CheckoutFieldProps) {
  return (
    <div
      className={`checkout-field${fullWidth ? ' checkout-field--full' : ''}${
        error ? ' checkout-field--error' : ''
      }`}
    >
      <label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p className="checkout-field__error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
