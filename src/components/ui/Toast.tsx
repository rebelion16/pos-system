'use client'

import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import styles from './Toast.module.css'

interface Toast {
    id: string
    title: string
    description?: string
    type?: 'success' | 'error' | 'warning' | 'info'
}

interface ToastContainerProps {
    toasts: Toast[]
    onRemove: (id: string) => void
}

const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
}

const colorMap = {
    success: 'var(--success-500)',
    error: 'var(--danger-500)',
    warning: 'var(--warning-500)',
    info: 'var(--primary-500)',
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    if (toasts.length === 0) return null

    return (
        <div className={styles.container}>
            {toasts.map((toast) => {
                const Icon = iconMap[toast.type || 'info']
                const color = colorMap[toast.type || 'info']

                return (
                    <div key={toast.id} className={styles.toast}>
                        <Icon size={20} style={{ color, flexShrink: 0 }} />
                        <div className={styles.content}>
                            <p className={styles.title}>{toast.title}</p>
                            {toast.description && (
                                <p className={styles.description}>{toast.description}</p>
                            )}
                        </div>
                        <button
                            onClick={() => onRemove(toast.id)}
                            className={styles.closeButton}
                        >
                            <X size={16} />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
