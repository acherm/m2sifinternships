"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, FileText, User, Calendar, Mail } from "lucide-react"

interface Subject {
  id: string
  title: string
  description: string
  main_supervisor_name: string
  main_supervisor_email: string
  co_supervisors_names?: string
  co_supervisors_emails?: string
  status: string
  created_at: string
  updated_at: string
  pdf_url?: string
}

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface Assignment {
  id: string
  student_id: string
  subject_id: string
  created_at: string
  student: Student
  subject: Subject
}

export default function ObserverDashboard() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch validated subjects
      const subjectsResponse = await fetch("/api/admin/subjects")
      if (!subjectsResponse.ok) {
        const errorData = await subjectsResponse.json()
        throw new Error(errorData.error || "Failed to fetch subjects")
      }
      const subjectsData = await subjectsResponse.json()
      const validatedSubjects = subjectsData.filter((subject: Subject) => subject.status === "validated")
      setSubjects(validatedSubjects)

      // Fetch assignments
      const assignmentsResponse = await fetch("/api/admin/assignments")
      if (!assignmentsResponse.ok) {
        const errorData = await assignmentsResponse.json()
        throw new Error(errorData.error || "Failed to fetch assignments")
      }
      const assignmentsData = await assignmentsResponse.json()
      setAssignments(assignmentsData)

    } catch (err) {
      console.error("Observer dashboard error:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading observer dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error: {error}</p>
              <button 
                onClick={fetchData}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Observer Dashboard</h1>
        <p className="text-gray-600">View validated internship subjects and assignments</p>
      </div>

      <Tabs defaultValue="subjects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Validated Subjects ({subjects.length})
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Assignments ({assignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Validated Internship Subjects
              </CardTitle>
              <CardDescription>
                List of all internship subjects that have been validated and are available for assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subjects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No validated subjects found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {subjects.map((subject) => (
                    <Card key={subject.id} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{subject.title}</h3>
                            <p className="text-gray-600 mb-3 line-clamp-2">{subject.description}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-1">Main Supervisor</h4>
                                <p className="text-sm">{subject.main_supervisor_name}</p>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {subject.main_supervisor_email}
                                </p>
                              </div>
                              
                              {subject.co_supervisors_names && (
                                <div>
                                  <h4 className="font-medium text-sm text-gray-700 mb-1">Co-Supervisor</h4>
                                  <p className="text-sm">{subject.co_supervisors_names}</p>
                                  {subject.co_supervisors_emails && (
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {subject.co_supervisors_emails}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Validated
                              </Badge>
                              <span className="text-sm text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Created {new Date(subject.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Student Assignments
              </CardTitle>
              <CardDescription>
                List of all validated student-internship assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No assignments found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <Card key={assignment.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Student</h4>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="font-semibold">
                                {assignment.student.first_name} {assignment.student.last_name}
                              </p>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {assignment.student.email}
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Assigned Subject</h4>
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="font-semibold">{assignment.subject.title}</p>
                              <p className="text-sm text-gray-600">
                                Supervisor: {assignment.subject.main_supervisor_name}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              Assigned
                            </Badge>
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Assigned {new Date(assignment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}