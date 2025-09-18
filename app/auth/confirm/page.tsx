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
      const type = params.get("type")
      const next = params.get("next") || "/app"
      const supabase = createClient()

      if (type === "recovery") {
        // Password recovery flows could be handled here if needed
        router.replace(next)
        return
      }

      if (!tokenHash) {
        setMessage("Missing confirmation token.")
        return
      }

      let error: any = null
      if (type === "magiclink" || type === "email") {
        const res = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash })
        error = res.error
      } else {
        const res = await supabase.auth.verifyOtp({ type: "signup", token_hash: tokenHash })
        error = res.error
      }
      if (error) {
        setMessage(`Confirmation failed: ${error.message}`)
        return
      }

      router.replace(next)
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm text-sm text-muted-foreground">{message}</div>
    </div>
  )
}


