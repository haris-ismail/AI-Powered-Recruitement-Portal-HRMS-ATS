import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentUser, removeToken, isAdmin } from "@/lib/auth";
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
  GraduationCap
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
  const { toast } = useToast();
  const user = getCurrentUser();
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [assessmentFilter, setAssessmentFilter] = useState<string>("");
  const [assessmentData, setAssessmentData] = useState<Record<number, AssessmentInfo>>({}); // candidateId -> info

  console.log("Current user:", user); // Debug log
  console.log("User role:", user?.role); // Debug log
  console.log("Is admin:", isAdmin()); // Debug log

  // Check if user is authenticated and is admin
  if (!user) {
    console.error("No user found");
    return <div>Loading...</div>;
  }

  if (user.role !== 'admin') {
    console.error("User is not admin:", user.role);
    return <div>Access denied. Admin role required.</div>;
  }

  const { data: jobs, error: jobsError } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    retry: false,
  });

  const { data: applications, refetch: refetchApplications, error: applicationsError } = useQuery<Application[]>({
    queryKey: [`/api/admin/applications/${selectedJobId}`],
    enabled: !!selectedJobId,
    retry: false,
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

  // Log any errors
  if (jobsError) console.error("Jobs error:", jobsError);
  if (applicationsError) console.error("Applications error:", applicationsError);

  console.log("Jobs data:", jobs); // Debug log
  console.log("Applications data:", applications); // Debug log

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: number; status: string }) => {
      const response = await apiRequest("PUT", `/api/applications/${applicationId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Application status updated successfully",
      });
      refetchApplications();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update application status",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (applicationId: number, newStatus: string) => {
    updateApplicationMutation.mutate({ applicationId, status: newStatus });
  };

  const handleSendEmail = (candidateId: number) => {
    toast({
      title: "Email Feature",
      description: "Email functionality will be implemented in the email templates section",
    });
  };

  const handleLogout = () => {
    removeToken();
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
