import React, { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Briefcase, FileText, LogOut, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { useAuthMigration } from "@/lib/auth-migration";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import { getCurrentUser, logout } from '@/lib/auth';
import logo from "@/assets/NASTPLogo.png";

interface AssessmentTemplate {
  id: number;
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
  categoryId: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
}

interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  experienceLevel: string;
  status: string;
  postedAt: string;
  description: string;
}

interface JobAssessment {
  id: number;
  jobId: number;
  job?: Job;
  templateId: number;
  isRequired: boolean;
  template: AssessmentTemplate;
  status?: 'not_started' | 'in_progress' | 'completed';
  attemptId?: number;
}

export default function CandidateAssessmentsPage() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuthMigration();
  
  const { data: assessments = [], isLoading, error } = useQuery({
    queryKey: ['candidateAssessments'],
    queryFn: async () => {
      console.log('Fetching candidate assessments...');
      console.log('User:', user);
      console.log('Auth loading:', authLoading);
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      try {
        const result = await fetcher('/candidate/pending-assessments');
        console.log('Assessments response:', result);
        return result;
      } catch (err) {
        console.error('Error fetching assessments:', err);
        throw err;
      }
    },
    refetchOnWindowFocus: false,
    retry: false,
    enabled: !!user && !authLoading, // Only run when user is authenticated
  });
  
  console.log('Assessments data:', assessments);
  console.log('Loading state:', isLoading);
  console.log('Error state:', error);
  console.log('Auth loading:', authLoading);
  console.log('User:', user);
  
  const assessmentsByJob: Record<number, JobAssessment[]> = {};
  
  // Group assessments by job ID
  assessments.forEach((assessment: JobAssessment) => {
    if (!assessmentsByJob[assessment.jobId]) {
      assessmentsByJob[assessment.jobId] = [];
    }
    assessmentsByJob[assessment.jobId].push(assessment);
  });

  const handleStartAssessment = async (templateId: number, jobId: number, attemptId?: number) => {
    try {
      let url = `/api/assessments/${templateId}/start`;
      const params = new URLSearchParams();
      
      if (attemptId) {
        params.append('attemptId', attemptId.toString());
      }
      if (jobId) {
        params.append('jobId', jobId.toString());
      }
      
      url = `${url}?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to start assessment');
      }
      
      const data = await response.json();
      navigate(`/assessment/${templateId}?attemptId=${data.attemptId}${jobId ? `&jobId=${jobId}` : ''}`);
    } catch (err) {
      console.error('Error starting assessment:', err);
      // Handle error (e.g., show toast notification)
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Please log in to view your assessments.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <img src={logo} alt="NASTP Logo" className="h-20 w-auto" />
            <Badge className="bg-accent text-white">Candidate Portal</Badge>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">
                {user?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-primary shadow-sm min-h-screen border-r border-primary-foreground/10">
          <nav className="p-4 space-y-2">
            <Link href="/candidate">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-primary-foreground hover:bg-primary-foreground/10">
                <User className="h-5 w-5" />
                <span>My Profile</span>
              </a>
            </Link>
            <Link href="/candidate/jobs">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-primary-foreground hover:bg-primary-foreground/10">
                <Briefcase className="h-5 w-5" />
                <span>Job Listings</span>
              </a>
            </Link>
            <Link href="/candidate/applications">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-primary-foreground hover:bg-primary-foreground/10">
                <FileText className="h-5 w-5" />
                <span>My Applications</span>
              </a>
            </Link>
            <Link href="/candidate/assessments">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-primary-foreground text-primary">
                <FileText className="h-5 w-5" />
                <span>My Assessments</span>
              </a>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">My Assessments</h2>
            <p className="text-gray-600">Complete these assessments to proceed with your job applications</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading assessments...</span>
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Error Loading Assessments
                </h3>
                <p className="text-gray-600">
                  There was an error loading your assessments. Please try again later.
                </p>
              </CardContent>
            </Card>
          ) : assessments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Assessments Available
                </h3>
                <p className="text-gray-600 mb-4">
                  You don't have any pending assessments at the moment.
                </p>
                <p className="text-sm text-gray-500">
                  Assessments will appear here when you apply for jobs that require them.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(assessmentsByJob).map(([jobId, jobAssessments]) => {
                const job = jobAssessments[0]?.job;
                return (
                  <Card key={jobId} className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      {job && (
                        <div>
                          <CardTitle className="text-lg text-gray-900">
                            {job.title} - {job.department}
                          </CardTitle>
                          <CardDescription className="text-gray-600">
                            {job.location} • {job.experienceLevel}
                          </CardDescription>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {jobAssessments.map((assessment) => (
                          <Card key={assessment.id} className="hover:shadow-md transition-shadow border border-gray-200">
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-base">{assessment.template.title}</CardTitle>
                                  <CardDescription className="mt-1 text-sm">
                                    {assessment.template.description}
                                  </CardDescription>
                                </div>
                                {assessment.status === 'in_progress' && (
                                  <Badge className="bg-yellow-100 text-yellow-800">
                                    In Progress
                                  </Badge>
                                )}
                                {assessment.status === 'completed' && (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Completed
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-2" />
                                  <span>{assessment.template.durationMinutes} min</span>
                                </div>
                                <div>
                                  <span className="font-medium">Passing Score:</span>
                                  <span className="ml-1">{assessment.template.passingScore}%</span>
                                </div>
                              </div>
                              <Button 
                                onClick={() => handleStartAssessment(
                                  assessment.templateId, 
                                  assessment.jobId,
                                  assessment.attemptId
                                )}
                                className="w-full"
                                variant={assessment.status === 'completed' ? 'outline' : 'default'}
                                disabled={assessment.status === 'completed'}
                              >
                                {assessment.status === 'completed' ? 'Assessment Completed' : 
                                 assessment.status === 'in_progress' ? 'Continue Assessment' : 'Start Assessment'}
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
        <ChatbotWidget />
      </div>
    </div>
  );
}