"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SubjectSubmissionForm } from "@/components/subject-submission-form"
import { SupervisorDashboard } from "@/components/supervisor-dashboard"

export function SupervisorDashboardClient() {
  const [showForm, setShowForm] = useState(false)

  if (showForm) {
    return (
      <div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 text-balance">Submit Internship Subject</h1>
          <p className="text-muted-foreground text-pretty">
            Submit your research internship subject for M2 SIF program review.
          </p>
        </div>
        <SubjectSubmissionForm />
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => setShowForm(false)}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return <SupervisorDashboard onCreateNew={() => setShowForm(true)} />
}
