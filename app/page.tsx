"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      router.replace(session ? "/app" : "/auth/login")
    })
  }, [router])

  return (
    <main className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
      <p>Loading…</p>
    </main>
  )
}
