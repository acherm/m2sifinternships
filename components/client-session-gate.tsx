"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ClientSessionGate() {
  const router = useRouter()
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace("/")
    }, 500)
    return () => clearTimeout(t)
  }, [router])
  return null
}


