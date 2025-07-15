import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentUser, removeToken } from "@/lib/auth";
import { 
  BarChart3, 
  Briefcase, 
  Users, 
  Calendar, 
  LogOut,
  Bell,
  Plus,
  Mail,
  Edit,
  Trash,
  X
} from "lucide-react";
import logo from "@/assets/NASTPLogo.png";

export default function AdminEmailTemplates() {
  const { toast } = useToast();
  const user = getCurrentUser();
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateFormData, setTemplateFormData] = useState({
    name: "",
    subject: "",
    body: ""
  });

  const { data: emailTemplates, isLoading } = useQuery({
    queryKey: ["/api/email-templates"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/email-templates", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email template created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setShowTemplateForm(false);
      setTemplateFormData({ name: "", subject: "", body: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create email template",
        variant: "destructive",
      });
    },
  });

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTemplateMutation.mutateAsync(templateFormData);
  };

  const handleLogout = () => {
    removeToken();
    window.location.href = "/login";
  };

  const defaultTemplates = [
    {
      name: "Interview Invitation",
      subject: "Interview Invitation - {{jobTitle}}",
      body: "Dear {{candidateName}},\n\nWe are pleased to inform you that your application for the {{jobTitle}} position has been reviewed, and we would like to invite you for an interview.\n\nInterview Details:\nDate: {{interviewDate}}\nTime: {{interviewTime}}\nLocation: {{interviewLocation}}\n\nPlease confirm your attendance by replying to this email.\n\nBest regards,\nHR Team"
    },
    {
      name: "Application Received",
      subject: "Application Received - {{jobTitle}}",
      body: "Dear {{candidateName}},\n\nThank you for your interest in the {{jobTitle}} position at our company. We have received your application and our team will review it carefully.\n\nWe will contact you within 5-7 business days regarding the next steps.\n\nBest regards,\nHR Team"
    },
    {
      name: "Job Offer",
      subject: "Job Offer - {{jobTitle}}",
      body: "Dear {{candidateName}},\n\nWe are excited to offer you the position of {{jobTitle}} at our company.\n\nOffer Details:\nPosition: {{jobTitle}}\nDepartment: {{department}}\nStart Date: {{startDate}}\nSalary: {{salary}}\n\nPlease review the attached offer letter and let us know your decision by {{responseDeadline}}.\n\nWe look forward to welcoming you to our team!\n\nBest regards,\nHR Team"
    },
    {
      name: "Application Rejection",
      subject: "Application Update - {{jobTitle}}",
      body: "Dear {{candidateName}},\n\nThank you for your interest in the {{jobTitle}} position and for taking the time to apply.\n\nAfter careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.\n\nWe encourage you to apply for future opportunities that match your background and interests.\n\nBest regards,\nHR Team"
    }
  ];

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
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
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
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-primary text-white">
                <Calendar className="h-5 w-5" />
                <span>Email Templates</span>
              </a>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Email Templates</h2>
              <p className="text-gray-600">Create and manage email templates for candidate communication</p>
            </div>
            <Button onClick={() => setShowTemplateForm(!showTemplateForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          {/* Template Creation Form */}
          {showTemplateForm && (
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Create New Email Template</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowTemplateForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTemplateSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={templateFormData.name}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                      placeholder="e.g. Interview Invitation"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input
                      id="subject"
                      value={templateFormData.subject}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, subject: e.target.value })}
                      placeholder="e.g. Interview Invitation - {{jobTitle}}"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Use variables like {"{candidateName}"}, {"{jobTitle}"}, {"{interviewDate}"} for dynamic content
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="body">Email Body</Label>
                    <Textarea
                      id="body"
                      value={templateFormData.body}
                      onChange={(e) => setTemplateFormData({ ...templateFormData, body: e.target.value })}
                      rows={8}
                      placeholder="Enter your email template content..."
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Available variables: {"{candidateName}"}, {"{jobTitle}"}, {"{department}"}, {"{interviewDate}"}, {"{interviewTime}"}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={createTemplateMutation.isPending}
                    >
                      {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Default Templates */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Templates</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {defaultTemplates.map((template, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{template.name}</CardTitle>
                    </div>
                    <Badge variant="secondary">Default</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Subject:</p>
                        <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                          {template.subject}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Body:</p>
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-xs">{template.body}</pre>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Templates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Custom Templates ({emailTemplates?.length || 0})
            </h3>
            
            {isLoading ? (
              <div className="text-center py-8">Loading templates...</div>
            ) : emailTemplates?.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Custom Templates
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Create your first custom email template to get started
                  </p>
                  <Button onClick={() => setShowTemplateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {emailTemplates?.map((template: any) => (
                  <Card key={template.id}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Subject:</p>
                          <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                            {template.subject}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Body:</p>
                          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-xs">{template.body}</pre>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Created: {new Date(template.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
