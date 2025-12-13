'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { localStorageService } from '@/lib/localStorage'
import { User } from '@/types/database'

interface AuthContextType {
    user: User | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signUp: (email: string, password: string, name: string, role?: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return

        // Initialize demo data
        localStorageService.initialize()

        // Check for existing session
        const currentUser = localStorageService.getCurrentUser()
        if (currentUser) {
            setUser(currentUser)
        }
        setLoading(false)
    }, [mounted])

    const refreshUser = async () => {
        const currentUser = localStorageService.getCurrentUser()
        setUser(currentUser)
    }

    const signIn = async (email: string, password: string) => {
        try {
            // For local mode, just check if email exists or create demo user
            let existingUser = localStorageService.getUserByEmail(email)

            if (!existingUser) {
                // In local mode, auto-create user on first login
                existingUser = localStorageService.createUser({
                    email,
                    name: email.split('@')[0],
                    role: 'owner',
                    avatar_url: null,
                })
            }

            localStorageService.setCurrentUser(existingUser)
            setUser(existingUser)
            return { error: null }
        } catch (err) {
            return { error: err as Error }
        }
    }

    const signUp = async (email: string, password: string, name: string, role: string = 'cashier') => {
        try {
            const existingUser = localStorageService.getUserByEmail(email)
            if (existingUser) {
                return { error: new Error('Email sudah terdaftar') }
            }

            const newUser = localStorageService.createUser({
                email,
                name,
                role: role as 'owner' | 'admin' | 'cashier',
                avatar_url: null,
            })

            localStorageService.setCurrentUser(newUser)
            setUser(newUser)
            return { error: null }
        } catch (err) {
            return { error: err as Error }
        }
    }

    const signOut = async () => {
        localStorageService.setCurrentUser(null)
        setUser(null)
    }

    // Prevent hydration mismatch
    if (!mounted) {
        return (
            <AuthContext.Provider value={{
                user: null,
                loading: true,
                signIn,
                signUp,
                signOut,
                refreshUser,
            }}>
                {children}
            </AuthContext.Provider>
        )
    }

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signIn,
            signUp,
            signOut,
            refreshUser,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
