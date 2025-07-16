import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentUser, removeToken } from "@/lib/auth";
import { 
  BarChart3, 
  Briefcase, 
  Users, 
  Calendar, 
  Plus,
  FileText,
  LogOut,
  Bell,
  Edit,
  Eye,
  X
} from "lucide-react";
import logo from "@/assets/NASTPLogo.png";

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

interface JobTemplate {
  id: number;
  title: string;
  department: string;
  experienceLevel?: string;
  location: string;
  salaryMin?: number;
  field?: string;
  requiredSkills?: string;
  description?: string;
  createdAt?: string;
  // Add other fields as needed
}

// Add AssessmentTemplate interface at the top
interface AssessmentTemplate {
  id: number;
  title: string;
  description?: string;
  categoryId: number;
  durationMinutes: number;
  passingScore: number;
  isActive: boolean;
  createdBy: number;
  createdAt?: string;
}

export default function AdminJobs() {
  const { toast } = useToast();
  const user = getCurrentUser();
  const [showJobForm, setShowJobForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [viewingJob, setViewingJob] = useState<any>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [jobFormData, setJobFormData] = useState({
    title: "",
    department: "",
    experienceLevel: "",
    location: "",
    salaryMin: "",
    field: "",
    requiredSkills: "",
    description: "",
    saveAsTemplate: false,
    assessmentTemplateId: null as number | null // <-- new field
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: templates } = useQuery<JobTemplate[]>({
    queryKey: ["/api/job-templates"],
  });

  // Fetch assessment templates
  const { data: assessmentTemplates } = useQuery<AssessmentTemplate[]>({
    queryKey: ["/api/assessment-templates"],
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/jobs", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job posted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setShowJobForm(false);
      setJobFormData({
        title: "",
        department: "",
        experienceLevel: "",
        location: "",
        salaryMin: "",
        field: "",
        requiredSkills: "",
        description: "",
        saveAsTemplate: false,
        assessmentTemplateId: null
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create job",
        variant: "destructive",
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/job-templates", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-templates"] });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      await apiRequest("DELETE", `/api/job-templates/${templateId}`);
      return null; // No response body expected for 204
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-templates"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/jobs/${editingJob.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Job updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setShowJobForm(false);
      setEditingJob(null);
      setJobFormData({
        title: "",
        department: "",
        experienceLevel: "",
        location: "",
        salaryMin: "",
        field: "",
        requiredSkills: "",
        description: "",
        saveAsTemplate: false,
        assessmentTemplateId: null
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update job",
        variant: "destructive",
      });
    },
  });

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (jobFormData.saveAsTemplate) {
      await createTemplateMutation.mutateAsync({
        title: jobFormData.title,
        department: jobFormData.department,
        experienceLevel: jobFormData.experienceLevel,
        location: jobFormData.location,
        salaryMin: jobFormData.salaryMin ? parseInt(jobFormData.salaryMin) : null,
        field: jobFormData.field,
        requiredSkills: jobFormData.requiredSkills,
        description: jobFormData.description,
      });
    }

    const jobData: any = {
      title: jobFormData.title,
      department: jobFormData.department,
      experienceLevel: jobFormData.experienceLevel,
      location: jobFormData.location,
      salaryMin: jobFormData.salaryMin ? parseInt(jobFormData.salaryMin) : null,
      field: jobFormData.field,
      requiredSkills: jobFormData.requiredSkills,
      description: jobFormData.description,
    };
    if (jobFormData.assessmentTemplateId) {
      jobData.assessmentTemplateId = jobFormData.assessmentTemplateId;
    }

    if (editingJob) {
      await updateJobMutation.mutateAsync(jobData);
    } else {
      await createJobMutation.mutateAsync(jobData);
    }
  };

  const handleLogout = () => {
    removeToken();
    window.location.href = "/login";
  };

  const handleUseTemplate = (template: any) => {
    setJobFormData({
      title: template.title,
      department: template.department,
      experienceLevel: template.experienceLevel,
      location: template.location,
      salaryMin: template.salaryMin?.toString() || "",
      field: template.field,
      requiredSkills: template.requiredSkills,
      description: template.description,
      saveAsTemplate: false,
      assessmentTemplateId: null
    });
    setShowTemplates(false);
    setShowJobForm(true);
  };

  const handleEditJob = (job: any) => {
    setEditingJob(job);
    setJobFormData({
      title: job.title,
      department: job.department,
      experienceLevel: job.experienceLevel,
      location: job.location,
      salaryMin: job.salaryMin?.toString() || "",
      field: job.field,
      requiredSkills: job.requiredSkills,
      description: job.description,
      saveAsTemplate: false,
      assessmentTemplateId: job.assessmentTemplateId || null
    });
    setShowJobForm(true);
  };

  const handleViewJob = (job: any) => {
    setViewingJob(job);
    setShowJobDetails(true);
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (window.confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
      await deleteTemplateMutation.mutateAsync(templateId);
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
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
                <BarChart3 className="h-5 w-5" />
                <span>Dashboard</span>
              </a>
            </Link>
            <Link href="/admin/jobs">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-primary text-white">
                <Briefcase className="h-5 w-5" />
                <span>Job Management</span>
              </a>
            </Link>
            <Link href="/admin/pipeline">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
                <Users className="h-5 w-5" />
                <span>Recruitment Pipeline</span>
              </a>
            </Link>
            <Link href="/admin/email-templates">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
                <Calendar className="h-5 w-5" />
                <span>Email Templates</span>
              </a>
            </Link>
            <Link href="/admin/assessment-templates">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
                <FileText className="h-5 w-5" />
                <span>Assessment Templates</span>
              </a>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Job Management</h2>
              <p className="text-gray-600">Create templates and manage job postings</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setShowTemplates(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Templates ({templates?.length || 0})
              </Button>
              <Button onClick={() => {
                setEditingJob(null);
                setJobFormData({
                  title: "",
                  department: "",
                  experienceLevel: "",
                  location: "",
                  salaryMin: "",
                  field: "",
                  requiredSkills: "",
                  description: "",
                  saveAsTemplate: false,
                  assessmentTemplateId: null
                });
                setShowJobForm(!showJobForm);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Job
              </Button>
            </div>
          </div>

          {/* Job Creation Form */}
          {showJobForm && (
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{editingJob ? "Edit Job Posting" : "Create New Job Posting"}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowJobForm(false);
                  setEditingJob(null);
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleJobSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="title">Job Title</Label>
                      <Input
                        id="title"
                        value={jobFormData.title}
                        onChange={(e) => setJobFormData({ ...jobFormData, title: e.target.value })}
                        placeholder="e.g. Senior Software Engineer"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={jobFormData.department}
                        onChange={(e) => setJobFormData({ ...jobFormData, department: e.target.value })}
                        placeholder="e.g. Engineering, Marketing, Sales"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="experienceLevel">Experience Level</Label>
                      <Select 
                        value={jobFormData.experienceLevel} 
                        onValueChange={(value) => setJobFormData({ ...jobFormData, experienceLevel: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Entry Level">Entry Level</SelectItem>
                          <SelectItem value="Mid Level">Mid Level</SelectItem>
                          <SelectItem value="Senior Level">Senior Level</SelectItem>
                          <SelectItem value="Lead Level">Lead Level</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={jobFormData.location}
                        onChange={(e) => setJobFormData({ ...jobFormData, location: e.target.value })}
                        placeholder="e.g. Remote, New York, NY"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="salaryMin">Minimum Salary</Label>
                      <Input
                        id="salaryMin"
                        type="number"
                        value={jobFormData.salaryMin}
                        onChange={(e) => setJobFormData({ ...jobFormData, salaryMin: e.target.value })}
                        placeholder="e.g. 50000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="field">Field</Label>
                      <Input
                        id="field"
                        value={jobFormData.field}
                        onChange={(e) => setJobFormData({ ...jobFormData, field: e.target.value })}
                        placeholder="e.g. Software Development, Marketing"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="requiredSkills">Required Skills</Label>
                    <Textarea
                      id="requiredSkills"
                      value={jobFormData.requiredSkills}
                      onChange={(e) => setJobFormData({ ...jobFormData, requiredSkills: e.target.value })}
                      rows={3}
                      placeholder="e.g. JavaScript, React, Node.js, SQL"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Job Description</Label>
                    <Textarea
                      id="description"
                      value={jobFormData.description}
                      onChange={(e) => setJobFormData({ ...jobFormData, description: e.target.value })}
                      rows={6}
                      placeholder="Describe the role, responsibilities, and requirements..."
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="assessmentTemplateId">Assessment Template (optional)</Label>
                    <Select
                      value={jobFormData.assessmentTemplateId !== null ? String(jobFormData.assessmentTemplateId) : "none"}
                      onValueChange={(value) => setJobFormData({ ...jobFormData, assessmentTemplateId: value === "none" ? null : Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No assessment required" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No assessment required</SelectItem>
                        {assessmentTemplates?.map((tpl) => (
                          <SelectItem key={tpl.id} value={String(tpl.id)}>{tpl.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="saveAsTemplate"
                        checked={jobFormData.saveAsTemplate}
                        onCheckedChange={(checked) => 
                          setJobFormData({ ...jobFormData, saveAsTemplate: checked as boolean })
                        }
                      />
                      <Label htmlFor="saveAsTemplate">Save as template</Label>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={createJobMutation.isPending || createTemplateMutation.isPending || updateJobMutation.isPending}
                    >
                      {editingJob 
                        ? (updateJobMutation.isPending ? "Updating..." : "Update Job")
                        : (createJobMutation.isPending ? "Posting..." : "Post Job")
                      }
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Templates Modal */}
          <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Job Templates ({templates?.length || 0})</DialogTitle>
                <DialogDescription>
                  Manage your saved job templates. Use existing templates to quickly create new job postings.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {templates?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No templates saved yet. Create a job and check "Save as template" to get started.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {templates?.map((template: any) => (
                      <Card key={template.id} className="border border-gray-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{template.title}</CardTitle>
                            <Badge variant="secondary">Template</Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{template.department}</span>
                            <span>•</span>
                            <span>{template.experienceLevel}</span>
                            <span>•</span>
                            <span>{template.location}</span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Field:</p>
                            <p className="text-sm text-gray-600">{template.field}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Required Skills:</p>
                            <p className="text-sm text-gray-600 line-clamp-2">{template.requiredSkills}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Description:</p>
                            <p className="text-sm text-gray-600 line-clamp-3">{template.description}</p>
                          </div>
                          {template.salaryMin && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Min Salary:</p>
                              <p className="text-sm text-gray-600">${template.salaryMin.toLocaleString()}</p>
                            </div>
                          )}
                          <div className="pt-2 space-y-2">
                            <Button 
                              onClick={() => handleUseTemplate(template)}
                              className="w-full"
                            >
                              Use Template
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => handleDeleteTemplate(template.id)}
                              disabled={deleteTemplateMutation.isPending}
                              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deleteTemplateMutation.isPending ? "Deleting..." : "Delete Template"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Job Details Modal */}
          <Dialog open={showJobDetails} onOpenChange={setShowJobDetails}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{viewingJob?.title}</DialogTitle>
                <DialogDescription>
                  View detailed information about this job posting.
                </DialogDescription>
              </DialogHeader>
              {viewingJob && (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {viewingJob.department}
                    </Badge>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      {viewingJob.experienceLevel}
                    </Badge>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      {viewingJob.location}
                    </Badge>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {viewingJob.field}
                    </Badge>
                  </div>

                  {viewingJob.salaryMin && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Salary</h4>
                      <p className="text-gray-600">Starting from ${viewingJob.salaryMin.toLocaleString()}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Required Skills</h4>
                    <p className="text-gray-600 whitespace-pre-wrap">{viewingJob.requiredSkills}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Job Description</h4>
                    <div className="text-gray-600 whitespace-pre-wrap">
                      {viewingJob.description}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Posted on {new Date(viewingJob.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={() => {
                        setShowJobDetails(false);
                        handleEditJob(viewingJob);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Job
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Active Jobs List */}
          <Card>
            <CardHeader>
              <CardTitle>Active Job Postings</CardTitle>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="text-center py-8">Loading jobs...</div>
              ) : jobs?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No jobs posted yet. Create your first job posting above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Job Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {jobs?.map((job: any) => (
                        <tr key={job.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{job.title}</div>
                              <div className="text-sm text-gray-500">{job.experienceLevel}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {job.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {job.location}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              className={
                                job.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {job.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleViewJob(job)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditJob(job)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
