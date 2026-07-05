import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface ProgressBarProps {
  currentStep: 1 | 2 | 3
}

const STEPS = [
  { id: 1, label: 'Delivery' },
  { id: 2, label: 'Payment' },
  { id: 3, label: 'Confirm' },
] as const

export function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-sm mx-auto">
      {STEPS.map((step, idx) => {
        const isDone = step.id < currentStep
        const isCurrent = step.id === currentStep

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              {/* Circle */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                  isDone
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : isCurrent
                      ? 'border-brand-600 bg-white text-brand-600'
                      : 'border-gray-300 bg-white text-gray-400',
                )}
              >
                {isDone ? <Check className="w-4 h-4" /> : step.id}
              </div>
              {/* Label */}
              <span
                className={cn(
                  'text-[11px] mt-1 font-medium',
                  isCurrent ? 'text-brand-700' : isDone ? 'text-brand-600' : 'text-gray-400',
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-1 mb-5 transition-all',
                  step.id < currentStep ? 'bg-brand-600' : 'bg-gray-200',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
