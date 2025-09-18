"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertCircle, Edit, Eye, MessageSquare, ExternalLink, Plus } from "lucide-react"

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

interface SupervisorDashboardProps {
  onCreateNew: () => void
}

export function SupervisorDashboard({ onCreateNew }: SupervisorDashboardProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  const supabase = createClient()

  const resolvePdfUrl = async (pdfField: string | null) => {
    if (!pdfField) return null
    const isHttp = /^https?:\/\//i.test(pdfField)
    if (isHttp) return pdfField
    try {
      const res = await fetch(`/api/files/signed-url?path=${encodeURIComponent(pdfField)}`)
      const json = await res.json()
      return json.url || null
    } catch {
      return null
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("supervisor_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setSubjects(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch subjects")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditSubmit = async () => {
    if (!editingSubject) return

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      // Upload new PDF if provided
      let uploadedStoragePath: string | null = editingSubject.pdf_url
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
      }

      const response = await fetch("/api/subjects/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editingSubject.id,
          title: editingSubject.title,
          description: editingSubject.description,
          pdf_url: uploadedStoragePath,
          team_info: editingSubject.team_info,
          main_supervisor_name: editingSubject.main_supervisor_name,
          main_supervisor_email: editingSubject.main_supervisor_email,
          co_supervisors_names: editingSubject.co_supervisors_names || "",
          co_supervisors_emails: editingSubject.co_supervisors_emails || "",
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to update subject")
      }

      // Update local state - set status to pending since supervisor made changes
      setSubjects((prev) =>
        prev.map((subject) => 
          subject.id === editingSubject.id 
            ? { ...subject, ...editingSubject, pdf_url: uploadedStoragePath, status: "pending" as const }
            : subject
        ),
      )

      setEditingSubject(null)
      setPdfFile(null)
      setError(null) // Clear any previous errors
      setSuccessMessage("Subject updated successfully! Your changes have been submitted for administrator review.")
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null)
      }, 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update subject")
    } finally {
      setIsSubmitting(false)
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

  const canEdit = (status: Subject["status"]) => {
    return status === "pending" || status === "needs_modification"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your subjects...</p>
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

      {successMessage && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Submitted Subjects</h2>
          <p className="text-muted-foreground">Manage your internship subject proposals</p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Submit New Subject
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{subjects.filter((s) => s.status === "pending").length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {subjects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">You haven't submitted any subjects yet.</p>
              <Button onClick={onCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Submit Your First Subject
              </Button>
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
                      Submitted on {new Date(subject.created_at).toLocaleDateString()}
                      {subject.updated_at !== subject.created_at && (
                        <span> • Updated {new Date(subject.updated_at).toLocaleDateString()}</span>
                      )}
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

                  {subject.admin_comment && (
                    <div className="bg-muted p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4" />
                        <p className="text-sm font-medium">Admin Feedback:</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{subject.admin_comment}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedSubject(subject)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{subject.title}</DialogTitle>
                          <DialogDescription>View complete details of your internship subject.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Description</Label>
                            <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                              {subject.description}
                            </div>
                          </div>

                          {subject.pdf_url && (
                            <div>
                              <Label className="text-sm font-medium">PDF Document</Label>
                              <div className="mt-1">
                                <Button variant="outline" size="sm" asChild>
                                  <a href={subject.pdf_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View PDF
                                  </a>
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Team Information</Label>
                              <div className="mt-1 p-3 bg-muted rounded-md text-sm">{subject.team_info}</div>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Supervisors</Label>
                              <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                                <p>
                                  <strong>Main:</strong> {subject.main_supervisor_name} ({subject.main_supervisor_email}
                                  )
                                </p>
                                <p className="mt-1">
                                  <strong>Co-supervisors:</strong> {subject.co_supervisors_names}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">{subject.co_supervisors_emails}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button variant="outline" onClick={() => setSelectedSubject(null)}>
                            Close
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {canEdit(subject.status) && (
                      <Dialog open={!!editingSubject} onOpenChange={(open) => !open && setEditingSubject(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setEditingSubject({ ...subject })}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </DialogTrigger>

                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Subject</DialogTitle>
                            <DialogDescription>
                              Make changes to your internship subject. Only subjects that are pending or need
                              modification can be edited.
                            </DialogDescription>
                          </DialogHeader>

                          {editingSubject && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit-title">Title *</Label>
                                <Input
                                  id="edit-title"
                                  value={editingSubject.title}
                                  onChange={(e) => setEditingSubject({ ...editingSubject, title: e.target.value })}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="edit-description">Description *</Label>
                                <Textarea
                                  id="edit-description"
                                  value={editingSubject.description}
                                  onChange={(e) =>
                                    setEditingSubject({ ...editingSubject, description: e.target.value })
                                  }
                                  rows={6}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="edit-pdf">Replace PDF (Optional)</Label>
                                <div className="space-y-2">
                                  {editingSubject.pdf_url ? (
                                    <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                                      <p className="text-blue-800 font-medium">Current PDF: Available</p>
                                      <p className="text-blue-600 text-xs">Uploading a new PDF will override the existing one</p>
                                    </div>
                                  ) : (
                                    <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                                      <p className="text-gray-600">No PDF currently attached</p>
                                    </div>
                                  )}
                                  <Input id="edit-pdf" type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                                  {pdfFile && (
                                    <p className="text-xs text-green-600 font-medium">
                                      New PDF selected: {pdfFile.name}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="edit-team">Team Information *</Label>
                                <Textarea
                                  id="edit-team"
                                  value={editingSubject.team_info}
                                  onChange={(e) => setEditingSubject({ ...editingSubject, team_info: e.target.value })}
                                  rows={3}
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-main-name">Main Supervisor Name *</Label>
                                  <Input
                                    id="edit-main-name"
                                    value={editingSubject.main_supervisor_name}
                                    onChange={(e) =>
                                      setEditingSubject({ ...editingSubject, main_supervisor_name: e.target.value })
                                    }
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="edit-main-email">Main Supervisor Email *</Label>
                                  <Input
                                    id="edit-main-email"
                                    type="email"
                                    value={editingSubject.main_supervisor_email}
                                    onChange={(e) =>
                                      setEditingSubject({ ...editingSubject, main_supervisor_email: e.target.value })
                                    }
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="edit-co-names">Co-supervisors Names (Optional)</Label>
                                <Input
                                  id="edit-co-names"
                                  value={editingSubject.co_supervisors_names}
                                  onChange={(e) =>
                                    setEditingSubject({ ...editingSubject, co_supervisors_names: e.target.value })
                                  }
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="edit-co-emails">Co-supervisors Emails (Optional)</Label>
                                <Input
                                  id="edit-co-emails"
                                  type="email"
                                  value={editingSubject.co_supervisors_emails}
                                  onChange={(e) =>
                                    setEditingSubject({ ...editingSubject, co_supervisors_emails: e.target.value })
                                  }
                                />
                              </div>
                            </div>
                          )}

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingSubject(null)}>
                              Cancel
                            </Button>
                            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
                              {isSubmitting ? "Saving..." : "Save Changes"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}

                    {subject.pdf_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const url = await resolvePdfUrl(subject.pdf_url)
                          if (url) window.open(url, "_blank", "noopener,noreferrer")
                          else setError("Failed to generate PDF link")
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
    </div>
  )
}
