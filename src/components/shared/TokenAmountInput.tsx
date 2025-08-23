import { Input } from '../ui/input'

interface TokenAmountInputProps {
  value: string
  onChange: (value: string) => void
  maxValue: string | number
  tokenSymbol: string
  label: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TokenAmountInput({
  value,
  onChange,
  maxValue,
  tokenSymbol,
  label,
  placeholder = "0.00",
  disabled = false,
  className = ""
}: TokenAmountInputProps) {
  const maxValueNum = typeof maxValue === 'string' ? parseFloat(maxValue) : maxValue
  const maxValueStr = typeof maxValue === 'string' ? maxValue : maxValue.toString()

  return (
    <div className={className}>
      <label className="text-sm font-medium">{label}</label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        max={maxValueStr}
        className="mt-1"
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>Available: {maxValueNum.toLocaleString()} {tokenSymbol}</span>
        <button 
          onClick={() => onChange(maxValueStr)}
          className="text-primary hover:underline"
          disabled={disabled}
        >
          Max
        </button>
      </div>
    </div>
  )
}