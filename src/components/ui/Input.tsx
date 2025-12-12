'use client'

import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, helperText, id, ...props }, ref) => {
        const inputId = id || props.name

        return (
            <div className="input-group">
                {label && (
                    <label htmlFor={inputId} className="label">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`input ${error ? 'input-error' : ''} ${className}`}
                    {...props}
                />
                {error && <p className="error-text">{error}</p>}
                {helperText && !error && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {helperText}
                    </p>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'

export { Input }
