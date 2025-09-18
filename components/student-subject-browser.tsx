"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Search, Eye, ExternalLink, Users, Mail, BookOpen, Heart, HeartOff } from "lucide-react"

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
  status: string
  created_at: string
}

interface StudentChoice {
  id: string
  subject_id: string
  choice_rank: number
}

export function StudentSubjectBrowser() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([])
  const [studentChoices, setStudentChoices] = useState<StudentChoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null)

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

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    // Filter subjects based on search term
    const filtered = subjects.filter(
      (subject) =>
        subject.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.main_supervisor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.team_info.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredSubjects(filtered)
  }, [subjects, searchTerm])

  const fetchData = async () => {
    try {
      // Fetch validated subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("*")
        .eq("status", "validated")
        .order("created_at", { ascending: false })

      if (subjectsError) throw subjectsError

      // Fetch student's current choices
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { data: choicesData, error: choicesError } = await supabase
        .from("student_choices")
        .select("*")
        .eq("student_id", user.id)
        .order("choice_rank")

      if (choicesError) throw choicesError

      setSubjects(subjectsData || [])
      setStudentChoices(choicesData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
    } finally {
      setIsLoading(false)
    }
  }

  const addToChoices = async (subjectId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      // Check if already in choices
      if (studentChoices.some((choice) => choice.subject_id === subjectId)) {
        setError("This subject is already in your choices")
        return
      }

      // Check if we already have 3 choices
      if (studentChoices.length >= 3) {
        setError("You can only select up to 3 subjects")
        return
      }

      const nextRank = studentChoices.length + 1

      const { error } = await supabase.from("student_choices").insert({
        student_id: user.id,
        subject_id: subjectId,
        choice_rank: nextRank,
      })

      if (error) throw error

      // Update local state
      setStudentChoices((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          subject_id: subjectId,
          choice_rank: nextRank,
        },
      ])

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to choices")
    }
  }

  const removeFromChoices = async (subjectId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { error } = await supabase
        .from("student_choices")
        .delete()
        .eq("student_id", user.id)
        .eq("subject_id", subjectId)

      if (error) throw error

      // Update local state and reorder ranks
      const updatedChoices = studentChoices
        .filter((choice) => choice.subject_id !== subjectId)
        .map((choice, index) => ({ ...choice, choice_rank: index + 1 }))

      setStudentChoices(updatedChoices)

      // Update ranks in database
      for (const choice of updatedChoices) {
        await supabase
          .from("student_choices")
          .update({ choice_rank: choice.choice_rank })
          .eq("student_id", user.id)
          .eq("subject_id", choice.subject_id)
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove from choices")
    }
  }

  const getChoiceRank = (subjectId: string) => {
    const choice = studentChoices.find((c) => c.subject_id === subjectId)
    return choice ? choice.choice_rank : null
  }

  const isInChoices = (subjectId: string) => {
    return studentChoices.some((choice) => choice.subject_id === subjectId)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading internship subjects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Student Choices Summary */}
      {studentChoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Your Choices ({studentChoices.length}/3)
            </CardTitle>
            <CardDescription>Your selected internship preferences in order</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {studentChoices
                .sort((a, b) => a.choice_rank - b.choice_rank)
                .map((choice) => {
                  const subject = subjects.find((s) => s.id === choice.subject_id)
                  return (
                    <div key={choice.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Choice {choice.choice_rank}</Badge>
                        <div>
                          <p className="font-medium">{subject?.title}</p>
                          <p className="text-sm text-muted-foreground">{subject?.main_supervisor_name}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromChoices(choice.subject_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <HeartOff className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search">Search Internships</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            id="search"
            placeholder="Search by title, description, supervisor, or team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Subjects List */}
      <div className="space-y-4">
        {filteredSubjects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No subjects match your search criteria." : "No validated subjects available yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSubjects.map((subject) => {
            const choiceRank = getChoiceRank(subject.id)
            const inChoices = isInChoices(subject.id)

            return (
              <Card key={subject.id} className={inChoices ? "ring-2 ring-red-200" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{subject.title}</CardTitle>
                        {inChoices && <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Choice {choiceRank}</Badge>}
                      </div>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {subject.main_supervisor_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {subject.main_supervisor_email}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm line-clamp-3">{subject.description}</p>
                    </div>

                    <div className="text-sm">
                      <p className="font-medium mb-1">Research Team:</p>
                      <p className="text-muted-foreground line-clamp-2">{subject.team_info}</p>
                    </div>

                    {subject.co_supervisors_names && (
                      <div className="text-sm">
                        <p className="font-medium mb-1">Co-supervisors:</p>
                        <p className="text-muted-foreground">{subject.co_supervisors_names}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setSelectedSubject(subject)
                              const url = await resolvePdfUrl(subject.pdf_url)
                              setSignedPdfUrl(url)
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>

                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{subject.title}</DialogTitle>
                            <DialogDescription>Detailed information about this internship subject.</DialogDescription>
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
                                <Label className="text-sm font-medium">Additional Documentation</Label>
                                <div className="mt-2">
                                  <iframe
                                    src={signedPdfUrl || subject.pdf_url}
                                    className="w-full h-80 border rounded"
                                    title="Subject PDF"
                                  />
                                </div>
                              </div>
                            )}

                            <div>
                              <Label className="text-sm font-medium">Research Team & Laboratory</Label>
                              <div className="mt-1 p-3 bg-muted rounded-md text-sm">{subject.team_info}</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Main Supervisor</Label>
                                <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                                  <p className="font-medium">{subject.main_supervisor_name}</p>
                                  <p className="text-muted-foreground">{subject.main_supervisor_email}</p>
                                </div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Co-supervisors</Label>
                                <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                                  <p className="font-medium">{subject.co_supervisors_names}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{subject.co_supervisors_emails}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedSubject(null)}>
                              Close
                            </Button>
                            {!inChoices && studentChoices.length < 3 && (
                              <Button
                                onClick={() => {
                                  addToChoices(subject.id)
                                  setSelectedSubject(null)
                                }}
                              >
                                <Heart className="w-4 h-4 mr-2" />
                                Add to Choices
                              </Button>
                            )}
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

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

                      {!inChoices && studentChoices.length < 3 && (
                        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => addToChoices(subject.id)}>
                          <Heart className="w-4 h-4 mr-2" />
                          Add to Choices
                        </Button>
                      )}

                      {inChoices && (
                        <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => removeFromChoices(subject.id)}>
                          <HeartOff className="w-4 h-4 mr-2" />
                          Remove Choice
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
