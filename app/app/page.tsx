import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { AdminDashboard } from "@/components/admin-dashboard"
import { StudentSubjectBrowser } from "@/components/student-subject-browser"
import { SupervisorDashboardClient } from "@/components/supervisor-dashboard-client"
import ObserverDashboard from "@/components/observer-dashboard"
import "use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

function ClientSessionGate() {
  const router = useRouter()
  useEffect(() => {
    const url = new URL(window.location.href)
    // After confirm, just try to go home; middleware should allow if session exists
    const t = setTimeout(() => {
      router.replace("/")
    }, 500)
    return () => clearTimeout(t)
  }, [router])
  return null
}

export default async function AppPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Soft gate: if user not present, render a lightweight client gate that
  // rechecks session on the client rather than redirecting immediately.
  // This avoids races immediately after magic-link confirmation.
  if (!user) {
    return (
      <main className="min-h-screen bg-background">
        <div className="py-8 px-4">
          <div className="max-w-6xl mx-auto text-center text-muted-foreground">
            <p>Loading your session…</p>
            <ClientSessionGate />
          </div>
        </div>
      </main>
    )
  }

  // Get user profile to determine role
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    redirect("/auth/setup-profile")
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation user={user} profile={profile} />
      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {profile.role === "supervisor" && <SupervisorDashboardWrapper />}

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

function SupervisorDashboardWrapper() {
  return <SupervisorDashboardClient />
}
