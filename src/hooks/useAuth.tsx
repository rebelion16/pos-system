'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
    const supabase = createClient()

    const fetchUserProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()

        if (error) {
            console.error('Error fetching user profile:', error)
            return null
        }

        return data
    }

    const refreshUser = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
            const profile = await fetchUserProfile(authUser.id)
            setUser(profile)
            setSupabaseUser(authUser)
        }
    }

    useEffect(() => {
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                setSupabaseUser(session.user)
                const profile = await fetchUserProfile(session.user.id)
                setUser(profile)
            }

            setLoading(false)
        }

        initAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    setSupabaseUser(session.user)
                    const profile = await fetchUserProfile(session.user.id)
                    setUser(profile)
                } else if (event === 'SIGNED_OUT') {
                    setSupabaseUser(null)
                    setUser(null)
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        return { error: error as Error | null }
    }

    const signUp = async (email: string, password: string, name: string, role: string = 'cashier') => {
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
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setSupabaseUser(null)
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
