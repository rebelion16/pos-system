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

        // Check current session
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                setSupabaseUser(session.user)
                await fetchUserProfile(session.user.id)
            }
            setLoading(false)
        }

        checkSession()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setSupabaseUser(session.user)
                await fetchUserProfile(session.user.id)
            } else {
                setSupabaseUser(null)
                setUser(null)
            }
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [mounted])

    const fetchUserProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            if (error && error.code === 'PGRST116') {
                // User doesn't exist in users table, create profile
                const { data: { user: authUser } } = await supabase.auth.getUser()
                if (authUser) {
                    const newUser = {
                        id: authUser.id,
                        email: authUser.email!,
                        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
                        role: 'owner',
                        avatar_url: authUser.user_metadata?.avatar_url || null,
                    }

                    const { data: insertedUser } = await supabase
                        .from('users')
                        .insert(newUser)
                        .select()
                        .single()

                    if (insertedUser) {
                        setUser({
                            ...insertedUser,
                            email_verified: authUser.email_confirmed_at !== null
                        })
                    }
                }
            } else if (data) {
                const { data: { user: authUser } } = await supabase.auth.getUser()
                setUser({
                    ...data,
                    email_verified: authUser?.email_confirmed_at !== null
                })
            }
        } catch (err) {
            console.error('Error fetching user profile:', err)
        }
    }

    const refreshUser = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
            await fetchUserProfile(authUser.id)
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

            // Check if email confirmation is required
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
