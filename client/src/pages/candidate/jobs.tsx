import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentUser, removeToken } from "@/lib/auth";
import { 
  User, 
  Briefcase, 
  FileText, 
  LogOut,
  Search,
  MapPin,
  Calendar,
  Building,
  Clock,
  CheckCircle
} from "lucide-react";

export default function CandidateJobs() {
  const { toast } = useToast();
  const user = getCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedExperience, setSelectedExperience] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["/api/jobs"],
  });

  const { data: profile } = useQuery({
    queryKey: ["/api/profile"],
  });

  const applyForJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest("POST", "/api/applications", { jobId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Application submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    },
  });

  const handleApply = async (jobId: number) => {
    // Check if profile is complete
    if (!profile?.firstName || !profile?.lastName) {
      toast({
        title: "Profile Incomplete",
        description: "Please complete your profile before applying for jobs",
        variant: "destructive",
      });
      return;
    }

    await applyForJobMutation.mutateAsync(jobId);
  };

  const handleLogout = () => {
    removeToken();
    window.location.href = "/login";
  };

  const filteredJobs = jobs?.filter((job: any) => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = !selectedDepartment || selectedDepartment === "all" || job.department === selectedDepartment;
    const matchesExperience = !selectedExperience || selectedExperience === "all" || job.experienceLevel === selectedExperience;
    
    return matchesSearch && matchesDepartment && matchesExperience && job.status === 'active';
  }) || [];

  const selectedJob = jobs?.find((job: any) => job.id === selectedJobId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading jobs...</p>
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
        <aside className="w-64 bg-white shadow-sm min-h-screen border-r border-gray-200">
          <nav className="p-4 space-y-2">
            <Link href="/candidate">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
                <User className="h-5 w-5" />
                <span>My Profile</span>
              </a>
            </Link>
            <Link href="/candidate/jobs">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-primary text-white">
                <Briefcase className="h-5 w-5" />
                <span>Job Listings</span>
              </a>
            </Link>
            <Link href="/candidate/applications">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
                <FileText className="h-5 w-5" />
                <span>My Applications</span>
              </a>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Jobs</h2>
            <p className="text-gray-600">Browse and apply to open positions</p>
          </div>

          {/* Search and Filter */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedExperience} onValueChange={setSelectedExperience}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Entry Level">Entry Level</SelectItem>
                    <SelectItem value="Mid Level">Mid Level</SelectItem>
                    <SelectItem value="Senior Level">Senior Level</SelectItem>
                    <SelectItem value="Lead Level">Lead Level</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => {
                  setSearchQuery("");
                  setSelectedDepartment("all");
                  setSelectedExperience("all");
                }}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Job Listings */}
          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Jobs Found
                </h3>
                <p className="text-gray-600">
                  {jobs?.length === 0 
                    ? "No jobs are currently available. Check back later!"
                    : "No jobs match your current filters. Try adjusting your search criteria."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredJobs.map((job: any) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{job.title}</h3>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <Building className="h-4 w-4 mr-1" />
                          <span>Company Name</span>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {job.department}
                      </Badge>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                        {job.experienceLevel}
                      </Badge>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {job.location}
                      </Badge>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {job.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline"
                              onClick={() => setSelectedJobId(job.id)}
                            >
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{selectedJob?.title}</DialogTitle>
                            </DialogHeader>
                            {selectedJob && (
                              <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                    {selectedJob.department}
                                  </Badge>
                                  <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                                    {selectedJob.experienceLevel}
                                  </Badge>
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {selectedJob.location}
                                  </Badge>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-2">Job Description</h4>
                                  <div className="text-gray-600 whitespace-pre-wrap">
                                    {selectedJob.description}
                                  </div>
                                </div>
                                <div className="flex items-center text-sm text-gray-500">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span>Posted on {new Date(selectedJob.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="pt-4 border-t">
                                  <Button 
                                    onClick={() => handleApply(selectedJob.id)}
                                    disabled={applyForJobMutation.isPending}
                                    className="w-full"
                                  >
                                    {applyForJobMutation.isPending ? "Applying..." : "Apply Now"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button 
                          onClick={() => handleApply(job.id)}
                          disabled={applyForJobMutation.isPending}
                        >
                          {applyForJobMutation.isPending ? "Applying..." : "Apply Now"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
