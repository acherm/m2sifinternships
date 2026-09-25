"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/supabase/data"
import { Navigation } from "@/components/navigation"
import { AdminDashboard } from "@/components/admin-dashboard"
import { StudentSubjectBrowser } from "@/components/student-subject-browser"
import { SupervisorDashboardClient } from "@/components/supervisor-dashboard-client"
import ObserverDashboard from "@/components/observer-dashboard"

export default function AppPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const load = async () => {
      // getSession reads the locally stored session; right after a magic-link
      // confirmation it may take a moment to be persisted, so retry briefly.
      let session = (await supabase.auth.getSession()).data.session
      for (let i = 0; i < 6 && !session; i++) {
        await new Promise((r) => setTimeout(r, 300))
        session = (await supabase.auth.getSession()).data.session
      }
      if (cancelled) return
      if (!session) {
        router.replace("/auth/login")
        return
      }

      const { data: prof, error: profError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle()
      if (cancelled) return
      if (profError) {
        setError(profError.message)
        setStatus("error")
        return
      }
      if (!prof) {
        router.replace("/auth/setup-profile")
        return
      }
      setUser(session.user)
      setProfile(prof as Profile)
      setStatus("ready")
    }

    load()

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/auth/login")
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [router])

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-background">
        <div className="py-8 px-4">
          <div className="max-w-6xl mx-auto text-center text-muted-foreground">
            <p>Loading your session…</p>
          </div>
        </div>
      </main>
    )
  }

  if (status === "error" || !user || !profile) {
    return (
      <main className="min-h-screen bg-background">
        <div className="py-8 px-4">
          <div className="max-w-6xl mx-auto text-center text-destructive">
            <p>Could not load your profile{error ? `: ${error}` : ""}.</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation user={user} profile={profile} />
      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {profile.role === "supervisor" && <SupervisorDashboardClient />}

          {profile.role === "admin" && (
            <div>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
                <p className="text-muted-foreground">Review and manage internship subjects.</p>
              </div>
              <AdminDashboard />
            </div>
          )}

          {profile.role === "student" && (
            <div>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Available Internships</h1>
                <p className="text-muted-foreground">Browse validated internship subjects and make your choices.</p>
              </div>
              <StudentSubjectBrowser />
            </div>
          )}

          {profile.role === "observer" && <ObserverDashboard />}
        </div>
      </div>
    </main>
  )
}
