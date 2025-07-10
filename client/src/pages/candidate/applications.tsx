import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, removeToken } from "@/lib/auth";
import { 
  User, 
  Briefcase, 
  FileText, 
  LogOut,
  Calendar,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Star,
  Video,
  GraduationCap
} from "lucide-react";

const STATUS_CONFIG = {
  applied: {
    label: "Applied",
    color: "bg-blue-100 text-blue-800",
    icon: FileText,
    description: "Your application has been submitted and is under review"
  },
  shortlisted: {
    label: "Shortlisted",
    color: "bg-yellow-100 text-yellow-800",
    icon: Star,
    description: "Congratulations! You've been shortlisted for this position"
  },
  interview: {
    label: "Interview",
    color: "bg-green-100 text-green-800",
    icon: Video,
    description: "Interview has been scheduled"
  },
  hired: {
    label: "Hired",
    color: "bg-purple-100 text-purple-800",
    icon: CheckCircle,
    description: "Congratulations! You've been selected for this position"
  },
  onboarded: {
    label: "Onboarded",
    color: "bg-indigo-100 text-indigo-800",
    icon: GraduationCap,
    description: "Welcome to the team! Onboarding process completed"
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-800",
    icon: AlertCircle,
    description: "Unfortunately, your application was not successful this time"
  }
};

const PIPELINE_STAGES = [
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" },
  { key: "hired", label: "Hired" },
  { key: "onboarded", label: "Onboarded" }
];

export default function CandidateApplications() {
  const user = getCurrentUser();

  const { data: applications, isLoading } = useQuery({
    queryKey: ["/api/applications"],
  });

  const { data: jobs } = useQuery({
    queryKey: ["/api/jobs"],
  });

  const { data: profile } = useQuery({
    queryKey: ["/api/profile"],
  });

  const handleLogout = () => {
    removeToken();
    window.location.href = "/login";
  };

  const getJobDetails = (jobId: number) => {
    return jobs?.find((job: any) => job.id === jobId);
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.applied;
  };

  const getProgressPercentage = (status: string) => {
    const statusIndex = PIPELINE_STAGES.findIndex(stage => stage.key === status);
    return ((statusIndex + 1) / PIPELINE_STAGES.length) * 100;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">HRConnect</h1>
            <Badge className="bg-accent text-white">Candidate Portal</Badge>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">
                {profile?.firstName && profile?.lastName 
                  ? `${profile.firstName} ${profile.lastName}`
                  : user?.email
                }
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
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-primary-foreground text-primary">
                <FileText className="h-5 w-5" />
                <span>My Applications</span>
              </a>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">My Applications</h2>
            <p className="text-gray-600">Track your job application status</p>
          </div>

          {/* Applications List */}
          {!applications || applications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Applications Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  You haven't applied to any jobs yet. Start browsing available positions!
                </p>
                <Link href="/candidate/jobs">
                  <Button>
                    <Briefcase className="h-4 w-4 mr-2" />
                    Browse Jobs
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {applications.map((application: any) => {
                const jobDetails = getJobDetails(application.jobId);
                const statusConfig = getStatusConfig(application.status);
                const IconComponent = statusConfig.icon;
                const progressPercentage = getProgressPercentage(application.status);

                return (
                  <Card key={application.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {jobDetails?.title || `Job ID: ${application.jobId}`}
                          </h3>
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <Building className="h-4 w-4 mr-1" />
                            <span>{jobDetails?.department || "Unknown Department"}</span>
                            <span className="mx-2">•</span>
                            <span>{jobDetails?.location || "Location not specified"}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>Applied on {new Date(application.appliedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={statusConfig.color}>
                            <IconComponent className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            Updated {new Date(application.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Status Description */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{statusConfig.description}</p>
                      </div>

                      {/* Application Timeline */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Application Progress</span>
                          <span className="text-sm text-gray-500">{Math.round(progressPercentage)}% Complete</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Timeline Steps */}
                      <div className="flex items-center justify-between">
                        {PIPELINE_STAGES.map((stage, index) => {
                          const isActive = PIPELINE_STAGES.findIndex(s => s.key === application.status) >= index;
                          const isCurrent = stage.key === application.status;
                          
                          return (
                            <div key={stage.key} className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                isActive 
                                  ? isCurrent 
                                    ? 'bg-primary text-white' 
                                    : 'bg-green-500 text-white'
                                  : 'bg-gray-300 text-gray-500'
                              }`}>
                                {isActive && !isCurrent ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  index + 1
                                )}
                              </div>
                              <span className={`text-xs mt-1 text-center ${
                                isActive ? 'text-gray-900 font-medium' : 'text-gray-500'
                              }`}>
                                {stage.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Special Messages */}
                      {application.status === 'interview' && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center">
                            <Video className="h-5 w-5 text-blue-600 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-blue-900">Interview Scheduled</p>
                              <p className="text-sm text-blue-700">
                                You will receive an email with interview details shortly.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {application.status === 'hired' && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-green-900">Congratulations!</p>
                              <p className="text-sm text-green-700">
                                You've been selected for this position. HR will contact you with next steps.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {application.status === 'rejected' && (
                        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-center">
                            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-red-900">Application Not Successful</p>
                              <p className="text-sm text-red-700">
                                Thank you for your interest. We encourage you to apply for future opportunities.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Job Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
