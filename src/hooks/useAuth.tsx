'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User as SupabaseUser } from '@supabase/supabase-js'

interface User {
    id: string
    email: string
    name: string
    role: 'owner' | 'admin' | 'cashier'
    avatar_url: string | null
    email_verified: boolean
}

interface AuthContextType {
    user: User | null
    supabaseUser: SupabaseUser | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null; needsVerification?: boolean }>
    signInWithGoogle: () => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return

        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()

                if (session?.user) {
                    setSupabaseUser(session.user)
                    await fetchUserProfile(session.user)
                }
            } catch (err) {
                console.error('Session check error:', err)
            } finally {
                setLoading(false)
            }
        }

        checkSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change:', event)
            if (session?.user) {
                setSupabaseUser(session.user)
                await fetchUserProfile(session.user)
            } else {
                setSupabaseUser(null)
                setUser(null)
            }
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [mounted])

    // Create user object from Supabase auth user (fallback if no users table)
    const createUserFromAuth = (authUser: SupabaseUser): User => {
        return {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
            role: 'owner',
            avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
            email_verified: authUser.email_confirmed_at !== null
        }
    }

    const fetchUserProfile = async (authUser: SupabaseUser) => {
        try {
            // Try to get from users table
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single()

            if (error) {
                // Table doesn't exist or user not found - use auth data directly
                console.log('Users table error, using auth data:', error.message)
                setUser(createUserFromAuth(authUser))
                return
            }

            if (data) {
                setUser({
                    ...data,
                    email_verified: authUser.email_confirmed_at !== null
                })
            } else {
                setUser(createUserFromAuth(authUser))
            }
        } catch (err) {
            console.error('Error fetching user profile:', err)
            // Fallback to auth user data
            setUser(createUserFromAuth(authUser))
        }
    }

    const refreshUser = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
            await fetchUserProfile(authUser)
        }
    }

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                return { error: new Error(error.message) }
            }

            return { error: null }
        } catch (err) {
            return { error: err as Error }
        }
    }

    const signUp = async (email: string, password: string, name: string) => {
        try {
            const { error, data } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/login`,
                    data: {
                        full_name: name,
                    }
                }
            })

            if (error) {
                return { error: new Error(error.message) }
            }

            if (data.user && !data.user.email_confirmed_at) {
                return { error: null, needsVerification: true }
            }

            return { error: null }
        } catch (err) {
            return { error: err as Error }
        }
    }

    const signInWithGoogle = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                }
            })

            if (error) {
                return { error: new Error(error.message) }
            }

            return { error: null }
        } catch (err) {
            return { error: err as Error }
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setSupabaseUser(null)
    }

    if (!mounted) {
        return (
            <AuthContext.Provider value={{
                user: null,
                supabaseUser: null,
                loading: true,
                signIn,
                signUp,
                signInWithGoogle,
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
            signInWithGoogle,
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
