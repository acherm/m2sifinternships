"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertCircle, Eye, MessageSquare, ExternalLink, Users, Heart, UserX, AlertTriangle } from "lucide-react"

interface Subject {
  id: string
  title: string
  description: string
  pdf_url: string | null
  team_info: string
  main_supervisor_name: string
  main_supervisor_email: string
  co_supervisors_names: string
  co_supervisors_emails: string
  status: "pending" | "validated" | "needs_modification" | "refused"
  admin_comment: string | null
  created_at: string
  updated_at: string
}

interface StudentChoice {
  id: string
  student_id: string
  subject_id: string
  choice_rank: number
  created_at: string
  student: {
    first_name: string
    last_name: string
    email: string
  }
  subject: {
    title: string
    main_supervisor_name: string
  }
}

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  created_at: string
}

interface Assignment {
  id: string
  student_id: string
  subject_id: string
  assigned_by: string
  created_at: string
  student: {
    first_name: string
    last_name: string
    email: string
  }
  subject: {
    title: string
    main_supervisor_name: string
  }
  assigned_by_profile: {
    first_name: string
    last_name: string
  }
}

export function AdminDashboard() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [studentChoices, setStudentChoices] = useState<StudentChoice[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [reviewStatus, setReviewStatus] = useState<string>("")
  const [adminComment, setAdminComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedStudentForAssignment, setSelectedStudentForAssignment] = useState<UserProfile | null>(null)
  const [selectedSubjectForAssignment, setSelectedSubjectForAssignment] = useState<Subject | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailAssignment, setEmailAssignment] = useState<Assignment | null>(null)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("*")
        .order("created_at", { ascending: false })

      if (subjectsError) throw subjectsError

      // Use server API routes (service role) to bypass RLS for admin-only views
      const [choicesRes, usersRes] = await Promise.all([
        fetch("/api/admin/choices", { credentials: "include" }),
        fetch("/api/admin/users", { credentials: "include" }),
      ])

      // Try to fetch assignments, but don't fail if table doesn't exist yet
      let assignmentsRes
      try {
        assignmentsRes = await fetch("/api/assignments", { credentials: "include" })
      } catch (err) {
        console.warn("Assignments table not available yet:", err)
        assignmentsRes = { ok: false, json: () => Promise.resolve({ assignments: [] }) }
      }

      if (!choicesRes.ok) {
        const err = await choicesRes.json().catch(() => ({}))
        throw new Error(`Failed to load choices${err?.error ? `: ${err.error}` : ""}`)
      }
      if (!usersRes.ok) {
        const err = await usersRes.json().catch(() => ({}))
        throw new Error(`Failed to load users${err?.error ? `: ${err.error}` : ""}`)
      }
      // Handle assignments response gracefully
      let assignmentsData = []
      if (assignmentsRes.ok) {
        const assignmentsJson = await assignmentsRes.json()
        assignmentsData = assignmentsJson.assignments || []
      } else {
        console.warn("Assignments not available - table may not exist yet")
        assignmentsData = []
      }

      const choicesJson = await choicesRes.json()
      const usersJson = await usersRes.json()

      setSubjects(subjectsData || [])
      setStudentChoices(choicesJson.choices || [])
      setUsers(usersJson.users || [])
      setAssignments(assignmentsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReviewSubmit = async () => {
    if (!selectedSubject || !reviewStatus) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("subjects")
        .update({
          status: reviewStatus,
          admin_comment: adminComment || null,
        })
        .eq("id", selectedSubject.id)

      if (error) throw error


      setSubjects((prev) =>
        prev.map((subject) =>
          subject.id === selectedSubject.id
            ? { ...subject, status: reviewStatus as any, admin_comment: adminComment || null }
            : subject,
        ),
      )

      setSelectedSubject(null)
      setReviewStatus("")
      setAdminComment("")
      setIsDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update subject")
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteUser = async (userId: string) => {
    setConfirmDeleteId(userId)
  }

  const handleAssignment = async () => {
    if (!selectedStudentForAssignment || !selectedSubjectForAssignment) return

    setIsAssigning(true)
    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          student_id: selectedStudentForAssignment.id,
          subject_id: selectedSubjectForAssignment.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create assignment")
      }

      // Refresh data
      await fetchAllData()
      setSelectedStudentForAssignment(null)
      setSelectedSubjectForAssignment(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assignment")
    } finally {
      setIsAssigning(false)
    }
  }

  const handleSendEmail = async () => {
    if (!emailAssignment) return

    console.log("📧 Starting to send email for assignment:", emailAssignment)
    setIsSendingEmail(true)
    try {
      const emailPayload = {
        studentEmail: emailAssignment.student.email,
        studentName: `${emailAssignment.student.first_name} ${emailAssignment.student.last_name}`,
        subjectTitle: emailAssignment.subject.title,
        supervisorName: emailAssignment.subject.main_supervisor_name,
      }
      console.log("📧 Sending payload:", emailPayload)
      
      const response = await fetch("/api/notifications/assignment-resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(emailPayload),
      })

      console.log("📧 Response status:", response.status)
      if (!response.ok) {
        const error = await response.json()
        console.error("📧 API Error:", error)
        throw new Error(error.error || "Failed to send email")
      }

      const result = await response.json()
      console.log("📧 Email sent successfully:", result)
      closeEmailDialog()
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email")
    } finally {
      setIsSendingEmail(false)
    }
  }

  const confirmEmail = (assignment: Assignment) => {
    console.log("📧 Opening email dialog for assignment:", assignment)
    // Set both states simultaneously
    setEmailAssignment(assignment)
    setShowEmailDialog(true)
  }

  const closeEmailDialog = () => {
    console.log("📧 Closing email dialog")
    setShowEmailDialog(false)
    setEmailAssignment(null)
  }

  // Debug dialog state changes
  useEffect(() => {
    console.log("📧 Dialog state changed - showEmailDialog:", showEmailDialog, "emailAssignment:", emailAssignment)
  }, [showEmailDialog, emailAssignment])

  // Force dialog to open when emailAssignment is set
  useEffect(() => {
    if (emailAssignment && !showEmailDialog) {
      console.log("📧 Force opening dialog for assignment:", emailAssignment.id)
      setShowEmailDialog(true)
    }
  }, [emailAssignment, showEmailDialog])

  const deleteAssignment = async (assignmentId: string) => {
    const confirmed = window.confirm("Are you sure you want to remove this assignment?")
    if (!confirmed) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete assignment")
      }

      // Refresh data
      await fetchAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete assignment")
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${confirmDeleteId}`, { method: "DELETE", credentials: "include" })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to delete user")
      }
      setUsers((prev) => prev.filter((user) => user.id !== confirmDeleteId))
      setError(null)
      setConfirmDeleteId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user")
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: Subject["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending Review</Badge>
      case "validated":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Validated
          </Badge>
        )
      case "needs_modification":
        return (
          <Badge variant="destructive" className="bg-yellow-100 text-yellow-800">
            Needs Modification
          </Badge>
        )
      case "refused":
        return <Badge variant="destructive">Refused</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getStatusIcon = (status: Subject["status"]) => {
    switch (status) {
      case "validated":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "needs_modification":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case "refused":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="subjects" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="subjects">Subjects Review</TabsTrigger>
          <TabsTrigger value="choices">Student Choices</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Subjects</p>
                    <p className="text-2xl font-bold">{subjects.length}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{subjects.filter((s) => s.status === "pending").length}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Validated</p>
                    <p className="text-2xl font-bold">{subjects.filter((s) => s.status === "validated").length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Needs Review</p>
                    <p className="text-2xl font-bold">
                      {subjects.filter((s) => s.status === "needs_modification" || s.status === "refused").length}
                    </p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {subjects.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No subjects submitted yet.</p>
                </CardContent>
              </Card>
            ) : (
              subjects.map((subject) => (
                <Card key={subject.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{subject.title}</CardTitle>
                        <CardDescription>
                          Submitted by {subject.main_supervisor_name} •{" "}
                          {new Date(subject.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(subject.status)}
                        {getStatusBadge(subject.status)}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Description:</p>
                        <p className="text-sm line-clamp-3">{subject.description}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Main Supervisor:</p>
                          <p className="text-muted-foreground">{subject.main_supervisor_email}</p>
                        </div>
                        <div>
                          <p className="font-medium">Team:</p>
                          <p className="text-muted-foreground line-clamp-2">{subject.team_info}</p>
                        </div>
                      </div>

                      {subject.admin_comment && (
                        <div className="bg-muted p-3 rounded-md">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            <p className="text-sm font-medium">Admin Comment:</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{subject.admin_comment}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Dialog open={isDialogOpen && selectedSubject?.id === subject.id} onOpenChange={(open) => {
                          setIsDialogOpen(open)
                          if (!open) {
                            setSignedPdfUrl(null)
                            setSelectedSubject(null)
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSubject(subject)
                                setReviewStatus(subject.status)
                                setAdminComment(subject.admin_comment || "")
                                setIsDialogOpen(true)
                                if (subject.pdf_url) {
                                  const isHttp = /^https?:\/\//i.test(subject.pdf_url)
                                  if (isHttp) setSignedPdfUrl(subject.pdf_url)
                                  else {
                                    fetch(`/api/files/signed-url?path=${encodeURIComponent(subject.pdf_url)}`)
                                      .then((r) => r.json())
                                      .then((j) => setSignedPdfUrl(j.url || null))
                                      .catch(() => setSignedPdfUrl(null))
                                  }
                                }
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                          </DialogTrigger>

                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{selectedSubject?.title}</DialogTitle>
                              <DialogDescription>
                                Review and update the status of this internship subject.
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium">Description</Label>
                                <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                                  {selectedSubject?.description}
                                </div>
                              </div>

                              {selectedSubject?.pdf_url && (
                                <div>
                                  <Label className="text-sm font-medium">PDF Document</Label>
                                  <div className="mt-2">
                                    <iframe
                                      src={signedPdfUrl || selectedSubject.pdf_url}
                                      className="w-full h-80 border rounded"
                                      title="Subject PDF"
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium">Team Information</Label>
                                  <div className="mt-1 p-3 bg-muted rounded-md text-sm">{selectedSubject?.team_info}</div>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Supervisors</Label>
                                  <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                                    <p>
                                      <strong>Main:</strong> {selectedSubject?.main_supervisor_name} (
                                      {selectedSubject?.main_supervisor_email})
                                    </p>
                                    {selectedSubject?.co_supervisors_names && (
                                      <p className="mt-1">
                                        <strong>Co-supervisors:</strong> {selectedSubject.co_supervisors_names}
                                      </p>
                                    )}
                                    {selectedSubject?.co_supervisors_emails && (
                                      <p className="text-xs text-muted-foreground mt-1">{selectedSubject.co_supervisors_emails}</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4 border-t pt-4">
                                <div>
                                  <Label htmlFor="status">Review Status</Label>
                                  <Select value={reviewStatus} onValueChange={setReviewStatus}>
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending Review</SelectItem>
                                      <SelectItem value="validated">Validated</SelectItem>
                                      <SelectItem value="needs_modification">Needs Modification</SelectItem>
                                      <SelectItem value="refused">Refused</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {(reviewStatus === "needs_modification" || reviewStatus === "refused") && (
                                  <div>
                                    <Label htmlFor="comment">Admin Comment *</Label>
                                    <Textarea
                                      id="comment"
                                      value={adminComment}
                                      onChange={(e) => setAdminComment(e.target.value)}
                                      placeholder="Provide feedback or reason for this decision..."
                                      rows={3}
                                      className="mt-1"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button
                                onClick={handleReviewSubmit}
                                disabled={
                                  isSubmitting ||
                                  !reviewStatus ||
                                  ((reviewStatus === "needs_modification" || reviewStatus === "refused") &&
                                    !adminComment)
                                }
                              >
                                {isSubmitting ? "Updating..." : "Update Status"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {subject.pdf_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const isHttp = /^https?:\/\//i.test(subject.pdf_url as string)
                              if (isHttp) {
                                window.open(subject.pdf_url as string, "_blank", "noopener,noreferrer")
                              } else {
                                const res = await fetch(`/api/files/signed-url?path=${encodeURIComponent(subject.pdf_url as string)}`)
                                const j = await res.json().catch(() => ({}))
                                if (j?.url) window.open(j.url, "_blank", "noopener,noreferrer")
                                else setError("Failed to generate PDF link")
                              }
                            }}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open PDF
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="choices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Student Choices Overview
              </CardTitle>
              <CardDescription>View all student subject selections and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{new Set(studentChoices.map((c) => c.student_id)).size}</p>
                  <p className="text-sm text-muted-foreground">Students with Choices</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{studentChoices.length}</p>
                  <p className="text-sm text-muted-foreground">Total Choices Made</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{new Set(studentChoices.map((c) => c.subject_id)).size}</p>
                  <p className="text-sm text-muted-foreground">Subjects Selected</p>
                </div>
              </div>

              <div className="space-y-4">
                {studentChoices.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No student choices made yet.</p>
                  </div>
                ) : (
                  studentChoices.map((choice) => (
                    <div key={choice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">Choice {choice.choice_rank}</Badge>
                        <div>
                          <p className="font-medium">
                            {choice.student?.first_name || "Unknown"} {choice.student?.last_name || "Student"}
                          </p>
                          <p className="text-sm text-muted-foreground">{choice.student?.email || "No email"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{choice.subject?.title || "Unknown Subject"}</p>
                        <p className="text-sm text-muted-foreground">
                          Supervisor: {choice.subject?.main_supervisor_name || "Unknown Supervisor"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Student Assignments
              </CardTitle>
              <CardDescription>Assign students to their preferred internship subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{assignments.length}</p>
                  <p className="text-sm text-muted-foreground">Total Assignments</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{users.filter((u) => u.role === "student").length - assignments.length}</p>
                  <p className="text-sm text-muted-foreground">Unassigned Students</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{subjects.filter((s) => s.status === "validated").length - assignments.length}</p>
                  <p className="text-sm text-muted-foreground">Available Subjects</p>
                </div>
              </div>

              <div className="space-y-4">
                {assignments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No assignments made yet.</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      If you see this message and have run the database migrations, 
                      the assignments table should be available.
                    </p>
                  </div>
                ) : (
                  assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">
                            {assignment.student?.first_name || "Unknown"} {assignment.student?.last_name || "Student"}
                          </p>
                          <p className="text-sm text-muted-foreground">{assignment.student?.email || "No email"}</p>
                        </div>
                        <div className="text-muted-foreground">→</div>
                        <div>
                          <p className="font-medium">{assignment.subject?.title || "Unknown Subject"}</p>
                          <p className="text-sm text-muted-foreground">
                            Supervisor: {assignment.subject?.main_supervisor_name || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">
                          Assigned {new Date(assignment.created_at).toLocaleDateString()}
                        </p>
                        <Dialog open={showEmailDialog && emailAssignment?.id === assignment.id} onOpenChange={(open) => {
                          if (!open) closeEmailDialog()
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                confirmEmail(assignment)
                              }}
                              className="flex items-center gap-2"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Send Email
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md z-50">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" />
                                Send Assignment Email
                              </DialogTitle>
                              <DialogDescription>
                                Confirm sending an email notification to the student about their assignment.
                              </DialogDescription>
                            </DialogHeader>
                            
                            {emailAssignment && (
                              <div className="space-y-4">
                                <div className="bg-muted p-4 rounded-lg">
                                  <h4 className="font-medium mb-2">Assignment Details</h4>
                                  <p><strong>Student:</strong> {emailAssignment.student.first_name} {emailAssignment.student.last_name}</p>
                                  <p><strong>Email:</strong> {emailAssignment.student.email}</p>
                                  <p><strong>Subject:</strong> {emailAssignment.subject.title}</p>
                                  <p><strong>Supervisor:</strong> {emailAssignment.subject.main_supervisor_name}</p>
                                </div>
                                
                                {error && (
                                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                    {error}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <DialogFooter>
                              <Button variant="outline" onClick={closeEmailDialog}>
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleSendEmail}
                                disabled={isSendingEmail}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                {isSendingEmail ? "Sending..." : "Send Email"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => deleteAssignment(assignment.id)}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Make New Assignment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="student-select">Select Student (with choices made)</Label>
                    <Select onValueChange={(value) => {
                      if (value === "no-students") return
                      const student = users.find(u => u.id === value)
                      setSelectedStudentForAssignment(student || null)
                      setSelectedSubjectForAssignment(null) // Reset subject selection when student changes
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a student with choices" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => {
                          // Only show students who:
                          // 1. Have role "student"
                          // 2. Don't already have an assignment
                          // 3. Have made at least one choice
                          return u.role === "student" && 
                                 !assignments.some(a => a.student_id === u.id) &&
                                 studentChoices.some(c => c.student_id === u.id)
                        }).length > 0 ? (
                          users
                            .filter(u => {
                              return u.role === "student" && 
                                     !assignments.some(a => a.student_id === u.id) &&
                                     studentChoices.some(c => c.student_id === u.id)
                            })
                            .map((student) => {
                              const studentChoiceCount = studentChoices.filter(c => c.student_id === student.id).length
                              return (
                                <SelectItem key={student.id} value={student.id}>
                                  {student.first_name} {student.last_name} ({student.email}) - {studentChoiceCount} choice{studentChoiceCount !== 1 ? 's' : ''}
                                </SelectItem>
                              )
                            })
                        ) : (
                          <SelectItem value="no-students" disabled>
                            No students with choices available for assignment
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subject-select">Select Subject (from student's choices)</Label>
                    <Select onValueChange={(value) => {
                      if (value === "no-subjects" || value === "select-student-first") return
                      const subject = subjects.find(s => s.id === value)
                      setSelectedSubjectForAssignment(subject || null)
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a subject from student's choices" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedStudentForAssignment ? (
                          (() => {
                            const availableChoices = studentChoices
                              .filter(choice => choice.student_id === selectedStudentForAssignment.id)
                              .map(choice => {
                                const subject = subjects.find(s => s.id === choice.subject_id)
                                return subject && subject.status === "validated" && !assignments.some(a => a.subject_id === subject.id) ? subject : null
                              })
                              .filter((subject): subject is Subject => subject !== null)
                              .sort((a, b) => {
                                const choiceA = studentChoices.find(c => c.student_id === selectedStudentForAssignment.id && c.subject_id === a.id)
                                const choiceB = studentChoices.find(c => c.student_id === selectedStudentForAssignment.id && c.subject_id === b.id)
                                return (choiceA?.choice_rank || 0) - (choiceB?.choice_rank || 0)
                              })

                            return availableChoices.length > 0 ? (
                              availableChoices.map((subject) => {
                                const choice = studentChoices.find(c => c.student_id === selectedStudentForAssignment.id && c.subject_id === subject.id)
                                return (
                                  <SelectItem key={subject.id} value={subject.id}>
                                    Choice {choice?.choice_rank}: {subject.title} - {subject.main_supervisor_name}
                                  </SelectItem>
                                )
                              })
                            ) : (
                              <SelectItem value="no-subjects" disabled>
                                No available subjects from this student's choices
                              </SelectItem>
                            )
                          })()
                        ) : (
                          <SelectItem value="select-student-first" disabled>
                            Please select a student first
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="mt-4"
                  onClick={handleAssignment}
                  disabled={!selectedStudentForAssignment || !selectedSubjectForAssignment || isAssigning}
                >
                  {isAssigning ? "Assigning..." : "Make Assignment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
              <CardDescription>View and manage all registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{users.filter((u) => u.role === "student").length}</p>
                  <p className="text-sm text-muted-foreground">Students</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{users.filter((u) => u.role === "supervisor").length}</p>
                  <p className="text-sm text-muted-foreground">Supervisors</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{users.filter((u) => u.role === "admin").length}</p>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </div>
              </div>

              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {user.first_name || "Unknown"} {user.last_name || "User"}
                      </p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <Badge variant="outline" className="mt-1">
                        {user.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                      {user.role !== "admin" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => deleteUser(user.id)}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm deletion</DialogTitle>
                <DialogDescription>
                  This will permanently delete the selected user profile. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmDeleteId(null)} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </TabsContent>
      </Tabs>
    </div>
  )
}
