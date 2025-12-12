'use client'

import { useState, useCallback } from 'react'

interface ToastOptions {
    title: string
    description?: string
    type?: 'success' | 'error' | 'warning' | 'info'
    duration?: number
}

interface Toast extends ToastOptions {
    id: string
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([])

    const addToast = useCallback((options: ToastOptions) => {
        const id = Math.random().toString(36).substring(7)
        const toast: Toast = {
            ...options,
            id,
            type: options.type || 'info',
            duration: options.duration || 3000,
        }

        setToasts((prev) => [...prev, toast])

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, toast.duration)
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const success = useCallback((title: string, description?: string) => {
        addToast({ title, description, type: 'success' })
    }, [addToast])

    const error = useCallback((title: string, description?: string) => {
        addToast({ title, description, type: 'error' })
    }, [addToast])

    const warning = useCallback((title: string, description?: string) => {
        addToast({ title, description, type: 'warning' })
    }, [addToast])

    const info = useCallback((title: string, description?: string) => {
        addToast({ title, description, type: 'info' })
    }, [addToast])

    return {
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
    }
}
