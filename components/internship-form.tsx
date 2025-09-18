"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"

interface FormData {
  internshipTitle: string
  internshipSubject: string
  pdfLink: string
  team: string
  mainSupervisor: string
  mainSupervisorEmail: string
  coSupervisors: string
  coSupervisorsEmails: string
}

export function InternshipForm() {
  const [formData, setFormData] = useState<FormData>({
    internshipTitle: "",
    internshipSubject: "",
    pdfLink: "",
    team: "",
    mainSupervisor: "",
    mainSupervisorEmail: "",
    coSupervisors: "",
    coSupervisorsEmails: "",
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.internshipTitle.trim()) {
      newErrors.internshipTitle = "Internship title is required"
    }

    if (!formData.internshipSubject.trim()) {
      newErrors.internshipSubject = "Subject of the internship is required"
    }

    if (!formData.team.trim()) {
      newErrors.team = "Team information is required"
    }

    if (!formData.mainSupervisor.trim()) {
      newErrors.mainSupervisor = "Main supervisor name is required"
    }

    if (!formData.mainSupervisorEmail.trim()) {
      newErrors.mainSupervisorEmail = "Main supervisor email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.mainSupervisorEmail)) {
      newErrors.mainSupervisorEmail = "Please enter a valid email address"
    }

    if (!formData.coSupervisors.trim()) {
      newErrors.coSupervisors = "Co-supervisors information is required"
    }

    if (!formData.coSupervisorsEmails.trim()) {
      newErrors.coSupervisorsEmails = "Co-supervisors emails are required"
    } else {
      // Validate email format for multiple emails separated by semicolons
      const emails = formData.coSupervisorsEmails.split(";").map((email) => email.trim())
      const invalidEmails = emails.filter((email) => email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      if (invalidEmails.length > 0) {
        newErrors.coSupervisorsEmails = "Please enter valid email addresses separated by semicolons"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSubmitted(true)
    setIsSubmitting(false)
  }

  if (isSubmitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle2 className="h-6 w-6" />
            <div>
              <h3 className="font-semibold">Application Submitted Successfully</h3>
              <p className="text-sm text-green-600 mt-1">
                Your M2 SIF Research Internship application has been received. You will be contacted regarding the next
                steps.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Application Form</CardTitle>
        <CardDescription>
          Please provide all required information about your research internship proposal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Internship Title */}
          <div className="space-y-2">
            <Label htmlFor="internshipTitle" className="text-sm font-medium">
              Internship title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="internshipTitle"
              value={formData.internshipTitle}
              onChange={(e) => handleInputChange("internshipTitle", e.target.value)}
              placeholder="Enter the title of your internship"
              className={errors.internshipTitle ? "border-destructive" : ""}
            />
            {errors.internshipTitle && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.internshipTitle}
              </p>
            )}
          </div>

          {/* Subject of the internship */}
          <div className="space-y-2">
            <Label htmlFor="internshipSubject" className="text-sm font-medium">
              Subject of the internship (in raw text / markdown) <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="internshipSubject"
              value={formData.internshipSubject}
              onChange={(e) => handleInputChange("internshipSubject", e.target.value)}
              placeholder="Describe the subject and objectives of your internship..."
              rows={4}
              className={errors.internshipSubject ? "border-destructive" : ""}
            />
            {errors.internshipSubject && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.internshipSubject}
              </p>
            )}
          </div>

          {/* PDF Link (optional) */}
          <div className="space-y-2">
            <Label htmlFor="pdfLink" className="text-sm font-medium">
              (optional) Link to a PDF file for the subject of the internship
            </Label>
            <Input
              id="pdfLink"
              type="url"
              value={formData.pdfLink}
              onChange={(e) => handleInputChange("pdfLink", e.target.value)}
              placeholder="https://example.com/internship-details.pdf"
            />
          </div>

          {/* Team */}
          <div className="space-y-2">
            <Label htmlFor="team" className="text-sm font-medium">
              Team (if not from IRISA/Inria laboratory: please also give Lab and Institution){" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="team"
              value={formData.team}
              onChange={(e) => handleInputChange("team", e.target.value)}
              placeholder="e.g., IRISA/Inria or Lab Name, Institution"
              className={errors.team ? "border-destructive" : ""}
            />
            {errors.team && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.team}
              </p>
            )}
          </div>

          {/* Main supervisor */}
          <div className="space-y-2">
            <Label htmlFor="mainSupervisor" className="text-sm font-medium">
              Main supervisor (&lt;first name&gt; &lt;LAST NAME&gt;) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mainSupervisor"
              value={formData.mainSupervisor}
              onChange={(e) => handleInputChange("mainSupervisor", e.target.value)}
              placeholder="e.g., John SMITH"
              className={errors.mainSupervisor ? "border-destructive" : ""}
            />
            {errors.mainSupervisor && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.mainSupervisor}
              </p>
            )}
          </div>

          {/* Main supervisor email */}
          <div className="space-y-2">
            <Label htmlFor="mainSupervisorEmail" className="text-sm font-medium">
              Mail of main supervisor <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mainSupervisorEmail"
              type="email"
              value={formData.mainSupervisorEmail}
              onChange={(e) => handleInputChange("mainSupervisorEmail", e.target.value)}
              placeholder="supervisor@example.com"
              className={errors.mainSupervisorEmail ? "border-destructive" : ""}
            />
            {errors.mainSupervisorEmail && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.mainSupervisorEmail}
              </p>
            )}
          </div>

          {/* Co-supervisors */}
          <div className="space-y-2">
            <Label htmlFor="coSupervisors" className="text-sm font-medium">
              Co-supervisors (&lt;first name 1&gt; &lt;LAST NAME 1&gt; ; &lt;first name 2&gt; &lt;LAST NAME 2&gt; ; ...){" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="coSupervisors"
              value={formData.coSupervisors}
              onChange={(e) => handleInputChange("coSupervisors", e.target.value)}
              placeholder="e.g., Jane DOE ; Bob MARTIN"
              className={errors.coSupervisors ? "border-destructive" : ""}
            />
            {errors.coSupervisors && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.coSupervisors}
              </p>
            )}
          </div>

          {/* Co-supervisors emails */}
          <div className="space-y-2">
            <Label htmlFor="coSupervisorsEmails" className="text-sm font-medium">
              Mail of co-supervisors (please separate mails by semicolons: email1@exemple.com;email2@example.com){" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="coSupervisorsEmails"
              value={formData.coSupervisorsEmails}
              onChange={(e) => handleInputChange("coSupervisorsEmails", e.target.value)}
              placeholder="jane.doe@example.com;bob.martin@example.com"
              className={errors.coSupervisorsEmails ? "border-destructive" : ""}
            />
            {errors.coSupervisorsEmails && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.coSupervisorsEmails}
              </p>
            )}
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-accent text-primary-foreground"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting Application..." : "Submit Application"}
            </Button>
          </div>
        </form>

        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Privacy Notice:</strong> This form does not automatically collect your personal details. The data
            you submit will be sent to the form owner for processing your internship application.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
