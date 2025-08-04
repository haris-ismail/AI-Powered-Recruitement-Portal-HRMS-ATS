import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { useAuthMigration } from "@/lib/auth-migration";
import { ChatbotWidget } from "@/components/ChatbotWidget";

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading assessments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading assessments. Please try again later.
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">No pending assessments</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have any pending assessments at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Assessments</h1>
        <p className="text-gray-600">Complete these assessments to proceed with your job applications</p>
      </div>

      {Object.entries(assessmentsByJob).map(([jobId, jobAssessments]) => {
        const job = jobAssessments[0]?.job;
        return (
          <div key={jobId} className="mb-10">
            {job && (
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {job.title} - {job.department}
              </h2>
            )}
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobAssessments.map((assessment) => (
                <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{assessment.template.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {assessment.template.description}
                        </CardDescription>
                      </div>
                      {assessment.status === 'in_progress' && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                          In Progress
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="font-medium">Duration</p>
                        <p>{assessment.template.durationMinutes} minutes</p>
                      </div>
                      <div>
                        <p className="font-medium">Passing Score</p>
                        <p>{assessment.template.passingScore}%</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handleStartAssessment(
                        assessment.templateId, 
                        assessment.jobId,
                        assessment.attemptId
                      )}
                      className="w-full"
                    >
                      {assessment.status === 'in_progress' ? 'Continue Assessment' : 'Start Assessment'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
      <ChatbotWidget />
    </div>
  );
}