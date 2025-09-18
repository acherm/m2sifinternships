"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { ProfileUpdateDialog } from "@/components/profile-update-dialog"

interface NavigationProps {
  user: User
  profile: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    role: string
  }
}

export function Navigation({ user, profile }: NavigationProps) {
  const router = useRouter()
  const supabase = createClient()
  const [showProfileUpdate, setShowProfileUpdate] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const handleProfileUpdate = () => {
    // Refresh the page to get updated profile data
    window.location.reload()
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold">M2 SIF Internship Platform</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {profile.first_name && profile.last_name 
                ? `${profile.first_name} ${profile.last_name} (${profile.role})`
                : `${profile.email} (${profile.role})`
              }
            </div>
            
            {!profile.first_name || !profile.last_name ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowProfileUpdate(true)}
                className="text-xs"
              >
                Update Profile
              </Button>
            ) : null}
            
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
      
      <ProfileUpdateDialog
        open={showProfileUpdate}
        onOpenChange={setShowProfileUpdate}
        currentEmail={profile.email}
        onUpdate={handleProfileUpdate}
      />
    </nav>
  )
}
