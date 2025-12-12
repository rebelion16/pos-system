'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    icon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
        const baseClass = 'btn'
        const variantClass = `btn-${variant}`
        const sizeClass = size !== 'md' ? `btn-${size}` : ''

        return (
            <button
                ref={ref}
                className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <Loader2 className="animate-spin" size={16} />
                ) : icon ? (
                    icon
                ) : null}
                {children}
            </button>
        )
    }
)

Button.displayName = 'Button'

export { Button }
