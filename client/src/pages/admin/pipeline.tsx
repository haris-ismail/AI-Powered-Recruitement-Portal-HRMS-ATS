import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import CandidateProfileCard from "@/components/candidate-profile-card";
import { 
  BarChart3, 
  Briefcase, 
  Users, 
  Calendar, 
  LogOut,
  Bell,
  FileText,
  Star,
  Video,
  CheckCircle,
  GraduationCap,
  Download
} from "lucide-react";
import logo from "@/assets/NASTPLogo.png";
import React, { useEffect, useState } from "react";

// Add these types for assessment info
interface AssessmentInfo {
  score: number;
  passed: boolean;
  status: string;
}

// Add these interfaces at the top of the file
interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  status: string;
  experienceLevel?: string;
  createdAt?: string;
  // Add other fields as needed
}

interface Application {
  id: number;
  jobId: number;
  status: string;
  appliedAt: string;
  updatedAt?: string;
  candidate: any; // You may want to type this more strictly
  // Add other fields as needed
}

const PIPELINE_STAGES = [
  { key: "applied", label: "Applied", icon: FileText, color: "blue" },
  { key: "shortlisted", label: "Shortlisted", icon: Star, color: "yellow" },
  { key: "interview", label: "Interview", icon: Video, color: "green" },
  { key: "hired", label: "Hired", icon: CheckCircle, color: "purple" },
  { key: "onboarded", label: "Onboarded", icon: GraduationCap, color: "indigo" },
];

export default function AdminPipeline() {
  console.log("AdminPipeline component is rendering"); // Debug log
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [assessmentFilter, setAssessmentFilter] = useState<string>("");
  const [assessmentData, setAssessmentData] = useState<Record<number, AssessmentInfo>>({}); // candidateId -> info
  const [jobWeights, setJobWeights] = useState({
    EducationScore: 0.5,
    SkillsScore: 0.3,
    ExperienceYearsScore: 0.1,
    ExperienceRelevanceScore: 0.1,
  });
  const [weightLoading, setWeightLoading] = useState(false);
  const [weightError, setWeightError] = useState("");

  // Add debug and batch resume extraction functionality
  const [debugData, setDebugData] = useState<any>(null);
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractError, setExtractError] = useState("");

  const { data: jobs, error: jobsError } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    retry: false,
  });

  const { data: applications, refetch: refetchApplications, error: applicationsError } = useQuery<Application[]>({
    queryKey: [`/api/admin/applications/${selectedJobId}`],
    enabled: !!selectedJobId,
    retry: false,
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: number; status: string }) => {
      console.log("updateApplicationMutation called:", { applicationId, status });
      const response = await apiRequest("PUT", `/api/applications/${applicationId}`, { status });
      console.log("API response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Mutation success:", data);
      toast({
        title: "Success",
        description: "Application status updated successfully",
      });
      refetchApplications();
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update application status",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Fetch assessment results for all candidates (example, you may need to adjust API call)
    async function fetchAssessments() {
      // Suppose you have a list of candidateIds
      const candidateIds = applications?.map((c: any) => c.candidate.id);
      const results: Record<number, AssessmentInfo> = {};
      for (const id of candidateIds || []) {
        const res = await apiRequest("GET", `/api/admin/candidates/${id}/assessments`);
        const data = await res.json();
        // Assume data[0] is latest or best attempt
        if (data.length > 0) {
          results[id] = {
            score: data[0].score,
            passed: data[0].passed,
            status: data[0].status || (data[0].passed ? "Passed" : "Failed"),
          };
        }
      }
      setAssessmentData(results);
    }
    fetchAssessments();
  }, [applications]);

  console.log("Current user:", user); // Debug log
  console.log("User role:", user?.role); // Debug log
  console.log("Is admin:", user?.role === 'admin'); // Debug log

  // Check if user is authenticated and is admin - AFTER ALL HOOKS
  if (!user) {
    console.error("No user found");
    return <div>Loading...</div>;
  }

  if (user.role !== 'admin') {
    console.error("User is not admin:", user.role);
    return <div>Access denied. Admin role required.</div>;
  }

  // Log any errors
  if (jobsError) console.error("Jobs error:", jobsError);
  if (applicationsError) console.error("Applications error:", applicationsError);

  console.log("Jobs data:", jobs); // Debug log
  console.log("Applications data:", applications); // Debug log

  const handleStatusChange = (applicationId: number, newStatus: string) => {
    console.log("handleStatusChange called:", { applicationId, newStatus });
    updateApplicationMutation.mutate({ applicationId, status: newStatus });
  };

  const handleSendEmail = (candidateId: number) => {
    toast({
      title: "Email Feature",
      description: "Email functionality will be implemented in the email templates section",
    });
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const groupedApplications = (applications as any[])?.reduce((acc: any, app: any) => {
    if (!acc[app.status]) {
      acc[app.status] = [];
    }
    acc[app.status].push(app);
    return acc;
  }, {}) || {};

  const getStageColor = (color: string) => {
    const colors = {
      blue: "bg-blue-50 border-blue-200",
      yellow: "bg-yellow-50 border-yellow-200", 
      green: "bg-green-50 border-green-200",
      purple: "bg-purple-50 border-purple-200",
      indigo: "bg-indigo-50 border-indigo-200",
    };
    return colors[color as keyof typeof colors] || "bg-gray-50 border-gray-200";
  };

  const getIconColor = (color: string) => {
    const colors = {
      blue: "text-blue-600",
      yellow: "text-yellow-600",
      green: "text-green-600", 
      purple: "text-purple-600",
      indigo: "text-indigo-600",
    };
    return colors[color as keyof typeof colors] || "text-gray-600";
  };

  const getBadgeColor = (color: string) => {
    const colors = {
      blue: "bg-blue-100 text-blue-800",
      yellow: "bg-yellow-100 text-yellow-800",
      green: "bg-green-100 text-green-800",
      purple: "bg-purple-100 text-purple-800", 
      indigo: "bg-indigo-100 text-indigo-800",
    };
    return colors[color as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  // Placeholder for batch update API call
  const handleApplyWeights = async () => {
    setWeightLoading(true);
    setWeightError("");
    try {
      console.log("Applying weights:", jobWeights);
      console.log("Job ID:", selectedJobId);
      
      const response = await apiRequest("POST", `/api/jobs/${selectedJobId}/regenerate-scores`, { weights: jobWeights });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const err = await response.json();
        console.error("API Error:", err);
        throw new Error(err.message || "Failed to update weights");
      }
      
      const result = await response.json();
      console.log("API Success:", result);
      
      // Show success message
      toast({
        title: "Success",
        description: `Updated AI scores for ${result.updated?.length || 0} applicants`,
      });
      
      refetchApplications();
    } catch (err: any) {
      console.error("Weight application error:", err);
      setWeightError(err?.message || "Failed to update weights");
    } finally {
      setWeightLoading(false);
    }
  };

  const handleDebugResumeStatus = async () => {
    if (!selectedJobId) {
      toast({
        title: "Error",
        description: "Please select a job first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("GET", `/api/debug/job/${selectedJobId}/resume-status`);
      const data = await response.json();
      setDebugData(data);
      
      toast({
        title: "Debug Info",
        description: `${data.applicationsWithResumeText}/${data.totalApplications} candidates have resume text`,
      });
    } catch (err: any) {
      console.error("Debug error:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to get debug info",
        variant: "destructive",
      });
    }
  };

  const handleBatchExtractResumeText = async () => {
    if (!selectedJobId) {
      toast({
        title: "Error",
        description: "Please select a job first",
        variant: "destructive",
      });
      return;
    }

    setExtractLoading(true);
    setExtractError("");
    
    try {
      const response = await apiRequest("POST", `/api/jobs/${selectedJobId}/extract-resume-text`);
      const result = await response.json();
      
      toast({
        title: "Success",
        description: `Extracted resume text for ${result.summary.extracted} candidates`,
      });
      
      // Refresh debug data
      handleDebugResumeStatus();
    } catch (err: any) {
      console.error("Batch extraction error:", err);
      setExtractError(err?.message || "Failed to extract resume text");
      toast({
        title: "Error",
        description: err?.message || "Failed to extract resume text",
        variant: "destructive",
      });
    } finally {
      setExtractLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!selectedJobId) {
      toast({
        title: "No job selected",
        description: "Please select a job first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the selected job title for the filename
      const selectedJob = jobs?.find(job => job.id.toString() === selectedJobId);
      const jobTitle = selectedJob?.title || selectedJobId;
      
      console.log('Starting CSV download for job:', selectedJobId);
      console.log('Job title:', jobTitle);
      
      // Try to use the apiRequest helper first
      let response;
      try {
        response = await apiRequest("GET", `/api/jobs/${selectedJobId}/download-applications`);
      } catch (apiError) {
        console.log('apiRequest failed, trying direct fetch:', apiError);
        // Fallback to direct fetch with proper headers
        response = await fetch(`/api/jobs/${selectedJobId}/download-applications`, {
          method: 'GET',
          headers: {
            'Content-Type': 'text/csv',
          },
          credentials: "include",
        });
      }

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      // Get the CSV content
      const csvContent = await response.text();
      console.log('CSV content length:', csvContent.length);
      console.log('CSV preview:', csvContent.substring(0, 200));
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `applications_${jobTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "CSV Download Started",
        description: "Your applications CSV file is being downloaded.",
      });
    } catch (error: any) {
      console.error('CSV download error:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download CSV file. Please check if you're logged in and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <img src={logo} alt="NASTP Logo" className="h-20 w-auto" />
            <Badge className="bg-primary text-white">Admin Panel</Badge>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-screen border-r border-gray-200">
          <nav className="p-4 space-y-2">
            <Link href="/admin">
              <a className="flex items-center space-x-3 px-4 py-3 h-12 rounded-lg text-gray-700 hover:bg-gray-100">
                <BarChart3 className="h-5 w-5" />
                <span>Dashboard</span>
              </a>
            </Link>
            <Link href="/admin/jobs">
              <a className="flex items-center space-x-3 px-4 py-3 h-12 rounded-lg text-gray-700 hover:bg-gray-100">
                <Briefcase className="h-5 w-5" />
                <span>Job Management</span>
              </a>
            </Link>
            <Link href="/admin/pipeline">
              <a className="flex items-center space-x-3 px-4 py-3 h-12 rounded-lg bg-primary text-white">
                <Users className="h-5 w-5" />
                <span>Recruitment Pipeline</span>
              </a>
            </Link>
            <Link href="/admin/resume-search">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
                <FileText className="h-5 w-5" />
                <span>Resume Search</span>
              </a>
            </Link>
            <Link href="/admin/email-templates">
              <a className="flex items-center space-x-3 px-4 py-3 h-12 rounded-lg text-gray-700 hover:bg-gray-100">
                <Calendar className="h-5 w-5" />
                <span>Email Templates</span>
              </a>
            </Link>
            <Link href="/admin/assessment-templates">
              <a className="flex items-center space-x-3 px-4 py-3 h-12 rounded-lg text-gray-700 hover:bg-gray-100">
                <FileText className="h-5 w-5" />
                <span>Assessment Templates</span>
              </a>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Recruitment Pipeline</h2>
            <p className="text-gray-600">Track candidates through the hiring process</p>
          </div>

          {/* Job Selection */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Select Job Position:</label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Choose a job position" />
                  </SelectTrigger>
                  <SelectContent>
                    {(jobs as any[])?.map((job: any) => (
                      <SelectItem key={job.id} value={job.id.toString()}>
                        {job.title} - {job.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced AI Scoring Weights UI */}
          {selectedJobId && (
            <Card className="mb-6 border-2 border-gradient-to-r from-blue-50 to-purple-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span>AI Scoring Weights Configuration</span>
                </CardTitle>
                <p className="text-sm text-gray-600">Customize how AI evaluates candidates for this position</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Total Weight Progress */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Total Weight</span>
                    <span className={`text-sm font-bold ${Object.values(jobWeights).reduce((a, b) => a + b, 0) === 1 ? 'text-green-600' : 'text-red-600'}`}>
                      {Object.values(jobWeights).reduce((a, b) => a + b, 0).toFixed(2)} / 1.00
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        Object.values(jobWeights).reduce((a, b) => a + b, 0) === 1 
                          ? 'bg-gradient-to-r from-green-400 to-green-600' 
                          : 'bg-gradient-to-r from-red-400 to-red-600'
                      }`}
                      style={{ width: `${Math.min(100, Object.values(jobWeights).reduce((a, b) => a + b, 0) * 100)}%` }}
                    ></div>
                  </div>
                  {Object.values(jobWeights).reduce((a, b) => a + b, 0) !== 1 && (
                    <p className="text-xs text-red-600 mt-1">Weights must sum to exactly 1.00</p>
                  )}
                </div>

                {/* Weight Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(jobWeights).map(([key, value]) => {
                    const label = key.replace(/Score$/, "");
                    const icon = {
                      Education: "🎓",
                      Skills: "⚡",
                      ExperienceYears: "📅",
                      ExperienceRelevance: "🎯"
                    }[label] || "📊";
                    
                    return (
                                             <div key={key} className="bg-white border border-gray-200 rounded-lg p-4 weight-card">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">{icon}</span>
                            <div>
                              <h4 className="font-medium text-gray-900">{label}</h4>
                              <p className="text-xs text-gray-500">Impact on AI scoring</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">{(value * 100).toFixed(0)}%</div>
                            <div className="text-xs text-gray-500">Weight</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={value}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setJobWeights(w => ({ ...w, [key]: val }));
                              }}
                              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                              style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${value * 100}%, #e5e7eb ${value * 100}%, #e5e7eb 100%)`
                              }}
                            />
                    <input
                      type="number"
                              min="0"
                              max="1"
                              step="0.01"
                              value={value}
                              onChange={(e) => {
                        const val = parseFloat(e.target.value);
                                setJobWeights(w => ({ ...w, [key]: isNaN(val) ? 0 : val }));
                      }}
                              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                          
                          {/* Visual weight indicator */}
                          <div className="flex space-x-1">
                            {[...Array(10)].map((_, i) => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded ${
                                  i < Math.floor(value * 10) 
                                    ? 'bg-gradient-to-r from-blue-400 to-blue-600' 
                                    : 'bg-gray-200'
                                }`}
                              ></div>
                ))}
              </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                    <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setJobWeights({
                        EducationScore: 0.4,
                        SkillsScore: 0.3,
                        ExperienceYearsScore: 0.2,
                        ExperienceRelevanceScore: 0.1,
                      })}
                    >
                      Reset to Default
                    </Button>
                                         <Button
                       variant="outline"
                       size="sm"
                       onClick={() => {
                         const total = Object.values(jobWeights).reduce((a, b) => a + b, 0);
                         if (total > 0) {
                           setJobWeights({
                             EducationScore: jobWeights.EducationScore / total,
                             SkillsScore: jobWeights.SkillsScore / total,
                             ExperienceYearsScore: jobWeights.ExperienceYearsScore / total,
                             ExperienceRelevanceScore: jobWeights.ExperienceRelevanceScore / total,
                           });
                         }
                       }}
                     >
                       Normalize Weights
                     </Button>
                                          <Button
                       variant="outline"
                       size="sm"
                       onClick={async () => {
                         try {
                           console.log("Testing AI scoring with weights:", jobWeights);
                           const response = await apiRequest("POST", "/api/test-ai-scoring", {
                             resume: "Sample resume with software development experience",
                             job_description: "Software Developer position",
                             weights: jobWeights
                           });
                           const result = await response.json();
                           console.log("Test result:", result);
                           toast({
                             title: "Test Complete",
                             description: `AI Score: ${result.result?.WeightedScore || 'N/A'}`,
                           });
                         } catch (err: any) {
                           console.error("Test error:", err);
                           toast({
                             title: "Test Failed",
                             description: err?.message || "Unknown error",
                             variant: "destructive",
                           });
                         }
                       }}
                     >
                       Test AI Scoring
                     </Button>
                  </div>
                  
                  <Button
                onClick={handleApplyWeights}
                disabled={weightLoading || Object.values(jobWeights).reduce((a, b) => a + b, 0) !== 1}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6"
              >
                    {weightLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Updating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Apply Weights to All Applicants</span>
                      </div>
                    )}
              </Button>
                </div>
                
                {weightError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-red-600">{weightError}</span>
                    </div>
                  </div>
                )}

                {/* Debug and Batch Extraction Section */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={handleDebugResumeStatus}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>Debug Resume Status</span>
                    </Button>

                    <Button
                      onClick={handleBatchExtractResumeText}
                      disabled={extractLoading}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      {extractLoading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      <span>{extractLoading ? "Extracting..." : "Batch Extract Resume Text"}</span>
                    </Button>

                    <Button
                      onClick={handleDownloadCSV}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download CSV</span>
                    </Button>
                  </div>

                  {debugData && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-blue-800">Debug Info</span>
                      </div>
                      <div className="text-sm text-blue-700">
                        <p>Job: {debugData.jobTitle}</p>
                        <p>Total Applications: {debugData.totalApplications}</p>
                        <p>With Resume Text: {debugData.applicationsWithResumeText}</p>
                        <p>Without Resume Text: {debugData.applicationsWithoutResumeText}</p>
                      </div>
                    </div>
                  )}

                  {extractError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-red-600">{extractError}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedJobId ? (
            <div className="flex flex-col gap-6">
              {PIPELINE_STAGES.map((stage) => {
                const stageApplications = groupedApplications[stage.key] || [];
                const IconComponent = stage.icon;
                
                return (
                  <Card key={stage.key} className={`${getStageColor(stage.color)} border-2`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <IconComponent className={`h-5 w-5 ${getIconColor(stage.color)}`} />
                          <span className="text-gray-900">{stage.label}</span>
                        </div>
                        <Badge className={getBadgeColor(stage.color)}>
                          {stageApplications.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                      {stageApplications.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No candidates in this stage
                        </p>
                      ) : (
                        stageApplications.map((application: any) => {
                          try {
                            if (!application.candidate) {
                              return (
                                <Card key={application.id} className="p-4">
                                  <p className="text-red-600">Candidate profile missing for this application</p>
                                </Card>
                              );
                            }
                            return (
                              <CandidateProfileCard
                                key={application.id}
                                candidate={application.candidate}
                                application={application}
                                onStatusChange={handleStatusChange}
                                onSendEmail={handleSendEmail}
                              />
                            );
                          } catch (error) {
                            console.error("Error rendering CandidateProfileCard:", error);
                            return (
                              <Card key={application.id} className="p-4">
                                <p className="text-red-600">Error loading candidate profile</p>
                              </Card>
                            );
                          }
                        })
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Select a Job Position
                </h3>
                <p className="text-gray-600">
                  Choose a job from the dropdown above to view the recruitment pipeline
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
