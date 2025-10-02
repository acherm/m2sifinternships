"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function ConfirmPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [message, setMessage] = useState("Confirming your email...")

  useEffect(() => {
    const run = async () => {
      const tokenHash = params.get("token_hash")
      const codeParam = params.get("code")
      const pkceToken = params.get("token")
      const type = params.get("type")
      const next = params.get("next") || "/app"
      const supabase = createClient()

      // Debug: Log all URL parameters
      console.log("🔍 Confirmation page URL params:", {
        token_hash: tokenHash,
        type: type,
        next: next,
        allParams: Object.fromEntries(params.entries()),
        fullURL: window.location.href
      })

      // If we have a PKCE magiclink token (token=pkce_...), verify via token_hash flow first
      if (pkceToken) {
        try {
          setMessage("Verifying your email link…")
          const { error } = await supabase.auth.verifyOtp({
            token_hash: pkceToken,
            type: 'magiclink' as any,
          })
          if (error) {
            // If session already exists despite error (race), proceed
            const { data } = await supabase.auth.getSession()
            if (!data.session) {
              console.warn("⚠️ Magic link verification error, waiting for session:", error)
              setMessage("Completing sign-in…")
              // do not return; continue to session poll and redirect below
            }
          }
          // Mark post-auth to let middleware allow next navigation
          try { document.cookie = "post_auth=1; Path=/; Max-Age=10" } catch {}
          // Poll until session exists to avoid SSR race in middleware
          const deadline = Date.now() + 4000
          while (Date.now() < deadline) {
            const { data } = await supabase.auth.getSession()
            if (data.session) break
            await new Promise((r) => setTimeout(r, 150))
          }
          setMessage("Signed in successfully! Redirecting…")
          setTimeout(() => {
            try {
              window.location.replace(next || "/")
            } catch {
              router.replace(next || "/")
            }
          }, 200)
          return
        } catch (err) {
          console.warn("⚠️ Magic link verify threw, waiting for session:", err)
          setMessage("Completing sign-in…")
          // continue to session poll and redirect
        }
      }

      // If we have an OAuth/PKCE code param (from OAuth providers), exchange it
      if (codeParam && codeParam.length > 0) {
        try {
          setMessage("Completing sign-in...")
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
          if (error) {
            // If session already exists despite exchange error (likely missing verifier in a different tab), proceed
            const { data } = await supabase.auth.getSession()
            if (!data.session) {
              console.warn("⚠️ Code exchange error, waiting for session:", error)
              setMessage("Completing sign-in…")
              // do not return; continue to session poll and redirect below
            }
          }

          // Mark post-auth to let middleware allow next navigation
          try { document.cookie = "post_auth=1; Path=/; Max-Age=10" } catch {}
          // Poll until session exists to avoid SSR race in middleware
          const deadline = Date.now() + 4000
          while (Date.now() < deadline) {
            const { data } = await supabase.auth.getSession()
            if (data.session) break
            await new Promise((r) => setTimeout(r, 150))
          }
          setMessage("Signed in successfully! Redirecting...")
          setTimeout(() => {
            try {
              window.location.replace(next || "/")
            } catch {
              router.replace(next || "/")
            }
          }, 200)
          return
        } catch (err) {
          console.warn("⚠️ Exchange threw, waiting for session:", err)
          setMessage("Completing sign-in…")
          // continue to session poll and redirect
        }
      }

      // Handle password recovery
      if (type === "recovery") {
        setMessage("Password recovery confirmed. Redirecting...")
        setTimeout(() => router.replace(next), 1000)
        return
      }

      // Check if we have a token
      if (!tokenHash) {
        setMessage("Missing confirmation token. Redirecting to login...")
        console.log("❌ No token_hash found in URL parameters")
        setTimeout(() => router.replace("/auth/login"), 2000)
        return
      }

      try {
        console.log("🔄 Attempting to verify OTP...")
        
        // Try to verify the OTP - let Supabase handle the type automatically
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any || 'email'
        })

        console.log("📧 Verification result:", { error, data })

        if (error) {
          console.warn("⚠️ Token-hash verification error, waiting for session:", error)
          setMessage("Completing sign-in…")
          // continue to session poll and redirect
        }

        console.log("✅ Verification successful!")
        setMessage("Email confirmed successfully! Redirecting...")
        
        // Mark post-auth to let middleware allow next navigation
        try { document.cookie = "post_auth=1; Path=/; Max-Age=10" } catch {}
        // Poll until session exists to avoid SSR race in middleware
        const deadline = Date.now() + 4000
        while (Date.now() < deadline) {
          const { data } = await supabase.auth.getSession()
          if (data.session) break
          await new Promise((r) => setTimeout(r, 150))
        }
        setTimeout(() => {
          try {
            window.location.replace(next || "/")
          } catch {
            router.replace(next || "/")
          }
        }, 200)

      } catch (error) {
        console.error("❌ Unexpected error:", error)
        setMessage("An unexpected error occurred. Please try again.")
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Email Confirmation</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}


