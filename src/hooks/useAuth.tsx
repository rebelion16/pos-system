'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User as SupabaseUser, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { User } from '@/types/database'

interface AuthContextType {
    user: User | null
    supabaseUser: SupabaseUser | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signUp: (email: string, password: string, name: string, role?: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)

    // Memoize supabase client to prevent recreation on every render
    const supabase = useMemo(() => createClient(), [])

    const fetchUserProfile = async (userId: string): Promise<User | null> => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                // Silently handle if table doesn't exist or no data
                if (error.code !== 'PGRST116') {
                    console.warn('Error fetching user profile:', error.message)
                }
                return null
            }

            return data
        } catch (err) {
            console.warn('Error fetching user profile:', err)
            return null
        }
    }

    const refreshUser = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (authUser) {
                const profile = await fetchUserProfile(authUser.id)
                setUser(profile)
                setSupabaseUser(authUser)
            }
        } catch (err) {
            console.warn('Error refreshing user:', err)
        }
    }

    // Set mounted flag to prevent hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return

        let isCancelled = false

        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()

                if (!isCancelled && session?.user) {
                    setSupabaseUser(session.user)
                    const profile = await fetchUserProfile(session.user.id)
                    if (!isCancelled) {
                        setUser(profile)
                    }
                }
            } catch (err) {
                console.warn('Error initializing auth:', err)
            } finally {
                if (!isCancelled) {
                    setLoading(false)
                }
            }
        }

        initAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
                if (isCancelled) return

                if (event === 'SIGNED_IN' && session?.user) {
                    setSupabaseUser(session.user)
                    const profile = await fetchUserProfile(session.user.id)
                    if (!isCancelled) {
                        setUser(profile)
                    }
                } else if (event === 'SIGNED_OUT') {
                    setSupabaseUser(null)
                    setUser(null)
                }
            }
        )

        return () => {
            isCancelled = true
            subscription.unsubscribe()
        }
    }, [mounted, supabase])

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            return { error: error as Error | null }
        } catch (err) {
            return { error: err as Error }
        }
    }

    const signUp = async (email: string, password: string, name: string, role: string = 'cashier') => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        role,
                    },
                },
            })
            return { error: error as Error | null }
        } catch (err) {
            return { error: err as Error }
        }
    }

    const signOut = async () => {
        try {
            await supabase.auth.signOut()
        } catch (err) {
            console.warn('Error signing out:', err)
        }
        setUser(null)
        setSupabaseUser(null)
    }

    // Prevent hydration mismatch by showing loading state until mounted
    if (!mounted) {
        return (
            <AuthContext.Provider value={{
                user: null,
                supabaseUser: null,
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
            supabaseUser,
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

