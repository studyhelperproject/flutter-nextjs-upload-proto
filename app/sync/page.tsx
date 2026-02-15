'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'

export default function SyncPage() {
    const router = useRouter()
    const [status, setStatus] = useState('Initializing...')

    useEffect(() => {
        const handleSync = async () => {
            console.log('Sync Page: Starting...', {
                url: process.env.NEXT_PUBLIC_SUPABASE_URL,
                hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            })
            setStatus('Parsing token...')

            // Get the hash from the URL
            const hash = window.location.hash.substring(1)
            if (!hash) {
                setStatus('No token found in URL.')
                return
            }

            // Parse query string style parameters from hash
            const params = new URLSearchParams(hash)
            const accessToken = params.get('access_token')
            const refreshToken = params.get('refresh_token')

            if (!accessToken || !refreshToken) {
                setStatus('Missing access_token or refresh_token.')
                return
            }

            setStatus('Restoring session...')
            try {
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                })

                if (error) {
                    throw error
                }

                setStatus('Session restored! Redirecting...')
                // Give it a moment to ensure cookies are set if needed, though client-side it's immediate for memory
                setTimeout(() => {
                    router.push('/') // Redirect to home or dashboard
                }, 1000)

            } catch (err: any) {
                console.error('Sync error:', err)
                setStatus(`Error restoring session: ${err.message}`)
            }
        }

        handleSync()
    }, [router])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <h1 className="text-2xl font-bold mb-4">Syncing to Next.js...</h1>
            <p className="text-lg">{status}</p>
        </div>
    )
}
