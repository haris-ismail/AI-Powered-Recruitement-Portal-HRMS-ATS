import React, { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Briefcase, FileText, Clock, Target, CheckCircle, AlertCircle, Play, BookOpen, LogOut, Building, MapPin } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { useAuthMigration } from "@/lib/auth-migration";
import { ChatbotWidget } from "@/components/ChatbotWidget";
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">In Progress</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Not Started</Badge>;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading authentication...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Please log in to view your assessments.
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
              <Button variant="ghost" size="sm" onClick={() => {
                localStorage.removeItem('token');
                window.location.href = "/login";
              }}>
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
            <Link href="/candidate/profile">
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
                <BookOpen className="h-5 w-5" />
                <span>My Assessments</span>
              </a>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-gray-900">My Assessments</h1>
            </div>
            <p className="text-gray-600 text-lg">Complete these assessments to proceed with your job applications</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2 text-lg">Loading assessments...</span>
            </div>
          ) : error ? (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <h3 className="text-lg font-medium text-red-800">Error Loading Assessments</h3>
                    <p className="text-red-700 mt-1">Please try again later or contact support if the problem persists.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : assessments.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <BookOpen className="h-16 w-16 text-gray-400" />
                  <h3 className="text-xl font-medium text-gray-900">No Pending Assessments</h3>
                  <p className="text-gray-500 max-w-md">
                    You don't have any pending assessments at the moment. 
                    Complete your job applications to receive assessment invitations.
                  </p>
                  <Link href="/candidate/jobs">
                    <Button className="mt-4">
                      <Briefcase className="h-4 w-4 mr-2" />
                      Browse Jobs
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(assessmentsByJob).map(([jobId, jobAssessments]) => {
                const job = jobAssessments[0]?.job;
                return (
                  <div key={jobId} className="space-y-4">
                    {job && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                              {job.title}
                            </h2>
                            <div className="flex items-center space-x-6 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <Building className="h-4 w-4" />
                                <span>{job.department}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4" />
                                <span>{job.location}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Target className="h-4 w-4" />
                                <span>{job.experienceLevel}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-sm">
                            {job.status}
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {jobAssessments.map((assessment) => (
                        <Card key={assessment.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(assessment.status || 'not_started')}
                                <CardTitle className="text-lg">{assessment.template.title}</CardTitle>
                              </div>
                              {getStatusBadge(assessment.status || 'not_started')}
                            </div>
                            <CardDescription className="mt-2 text-sm leading-relaxed">
                              {assessment.template.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pb-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="font-medium text-gray-700">Duration</p>
                                  <p className="text-gray-600">{assessment.template.durationMinutes} min</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Target className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="font-medium text-gray-700">Passing Score</p>
                                  <p className="text-gray-600">{assessment.template.passingScore}%</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter className="pt-0">
                            <Button 
                              onClick={() => handleStartAssessment(
                                assessment.templateId, 
                                assessment.jobId,
                                assessment.attemptId
                              )}
                              className="w-full"
                              size="lg"
                            >
                              {assessment.status === 'in_progress' ? (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Continue Assessment
                                </>
                              ) : (
                                <>
                                  <BookOpen className="h-4 w-4 mr-2" />
                                  Start Assessment
                                </>
                              )}
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <ChatbotWidget />
    </div>
  );
}