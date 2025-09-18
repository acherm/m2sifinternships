"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertTriangle, Upload, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

interface FormData {
  title: string
  description: string
  pdfUrl: string
  teamInfo: string
  mainSupervisorName: string
  mainSupervisorEmail: string
  coSupervisorsNames: string
  coSupervisorsEmails: string
}

export function SubjectSubmissionForm() {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    pdfUrl: "",
    teamInfo: "",
    mainSupervisorName: "",
    mainSupervisorEmail: "",
    coSupervisorsNames: "",
    coSupervisorsEmails: "",
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  // Store the storage path instead of public URL when using private bucket
  const [pdfStoragePath, setPdfStoragePath] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      // Upload PDF if provided via server (service role)
      let uploadedStoragePath: string | null = null
      if (pdfFile) {
        const form = new FormData()
        form.append("file", pdfFile)
        form.append("userId", user.id)
        const res = await fetch("/api/files/upload", { method: "POST", body: form, credentials: "include" })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j?.error || "Failed to upload PDF")
        }
        const j = await res.json()
        uploadedStoragePath = j.path || null
        setPdfStoragePath(uploadedStoragePath)
      }

      const response = await fetch("/api/subjects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          pdf_url: uploadedStoragePath || null,
          team_info: formData.teamInfo,
          main_supervisor_name: formData.mainSupervisorName,
          main_supervisor_email: formData.mainSupervisorEmail,
          co_supervisors_names: formData.coSupervisorsNames || "",
          co_supervisors_emails: formData.coSupervisorsEmails || "",
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to submit subject")
      }


      setSuccess(true)
      setShowWarning(false)

      // Reset form
      setFormData({
        title: "",
        description: "",
        pdfUrl: "",
        teamInfo: "",
        mainSupervisorName: "",
        mainSupervisorEmail: "",
        coSupervisorsNames: "",
        coSupervisorsEmails: "",
      })
      setPdfFile(null)
      setPdfStoragePath(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid =
    formData.title &&
    formData.description &&
    formData.teamInfo &&
    formData.mainSupervisorName &&
    formData.mainSupervisorEmail

  if (success) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-green-700">Subject Submitted Successfully!</CardTitle>
          <CardDescription>
            Your internship subject has been submitted for review. You will be notified once it has been reviewed by an
            administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setSuccess(false)} className="w-full">
            Submit Another Subject
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Internship Subject Submission</CardTitle>
        <CardDescription>
          Please provide all required information about your research internship subject.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Internship Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Enter the internship title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Subject Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Describe the internship subject in detail (supports markdown)"
            rows={6}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pdfFile">Upload PDF (Optional)</Label>
          <Input id="pdfFile" type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
          <p className="text-xs text-muted-foreground">PDFs are stored privately in Supabase. Use upload.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="teamInfo">Team Information *</Label>
          <Textarea
            id="teamInfo"
            value={formData.teamInfo}
            onChange={(e) => handleInputChange("teamInfo", e.target.value)}
            placeholder="Describe the research team and laboratory"
            rows={3}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="mainSupervisorName">Main Supervisor Name *</Label>
            <Input
              id="mainSupervisorName"
              value={formData.mainSupervisorName}
              onChange={(e) => handleInputChange("mainSupervisorName", e.target.value)}
              placeholder="Dr. John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mainSupervisorEmail">Main Supervisor Email *</Label>
            <Input
              id="mainSupervisorEmail"
              type="email"
              value={formData.mainSupervisorEmail}
              onChange={(e) => handleInputChange("mainSupervisorEmail", e.target.value)}
              placeholder="supervisor@university.edu"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="coSupervisorsNames">Co-supervisors Names (Optional)</Label>
          <Input
            id="coSupervisorsNames"
            value={formData.coSupervisorsNames}
            onChange={(e) => handleInputChange("coSupervisorsNames", e.target.value)}
            placeholder="Dr. Jane Smith, Prof. Bob Johnson"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="coSupervisorsEmails">Co-supervisors Emails (Optional)</Label>
          <Input
            id="coSupervisorsEmails"
            type="email"
            value={formData.coSupervisorsEmails}
            onChange={(e) => handleInputChange("coSupervisorsEmails", e.target.value)}
            placeholder="jane@university.edu, bob@university.edu"
          />
        </div>

        <Dialog open={showWarning} onOpenChange={setShowWarning}>
          <DialogTrigger asChild>
            <Button className="w-full" disabled={!isFormValid} onClick={() => setShowWarning(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Submit Subject
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Submission Requirements
              </DialogTitle>
              <DialogDescription className="space-y-3 text-left">
                <p>Before submitting your internship subject, please ensure:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>The subject description is detailed and comprehensive</li>
                  <li>All supervisor information is accurate and up-to-date</li>
                  <li>The research topic aligns with M2 SIF program requirements</li>
                  <li>You have permission from all listed supervisors</li>
                  <li>The PDF link (if provided) is accessible and relevant</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  Once submitted, your subject will be reviewed by administrators. You may be asked to make
                  modifications before approval.
                </p>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWarning(false)}>
                Review Again
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Submitting..." : "Confirm Submission"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
