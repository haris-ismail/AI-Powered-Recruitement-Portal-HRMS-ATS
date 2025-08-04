import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { fetcher } from '@/lib/fetcher';
import { getCurrentUser } from '@/lib/auth';
import { removeToken } from '@/lib/auth';

import { 
  User, 
  Briefcase, 
  MapPin, 
  Clock, 
  ArrowRight,
  FileText,
  Search,
  Building,
  LogOut
} from "lucide-react";
import logo from "@/assets/NASTPLogo.png";
import { ChatbotWidget } from "@/components/ChatbotWidget";

interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  experienceLevel: string;
  assessmentTemplateId: string | null;
  status: string;
  postedAt: string;
  description: string;
}

interface Profile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface Application {
  id: number;
  jobId: number;
  candidateId: number;
  status: string;
}

interface JobCardProps {
  job: Job;
  applications: Application[];
  applyingJobId: number | null;
  handleApply: (jobId: string | number, templateId: string) => void;
  handleUnapply: (applicationId: number) => void;
}

export default function CandidateJobs() {


  const queryClient = useQueryClient();

  const user = getCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedExperience, setSelectedExperience] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [justAppliedJobId, setJustAppliedJobId] = useState<number | null>(null);

  const { data: jobs = [], isLoading: isJobsLoading, error: jobsError } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => fetcher('/jobs'),
    refetchOnWindowFocus: false
  });

  const { data: profile, error: profileError } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => fetcher('/profile'),
    refetchOnWindowFocus: false
  });

  const { data: applications = [], refetch: refetchApplications, error: applicationsError } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => fetcher('/applications'),
    refetchOnWindowFocus: false
  });

  // Check localStorage for a just-applied job to immediately reflect UI
  useEffect(() => {
    const stored = localStorage.getItem('justAppliedJob');
    if (stored) {
      const idNum = parseInt(stored, 10);
      if (!Number.isNaN(idNum)) {
        setJustAppliedJobId(idNum);
        // Refetch applications to ensure the button updates correctly
        refetchApplications();
      }
      localStorage.removeItem('justAppliedJob');
    }
  }, [refetchApplications]);

  const { mutate: unapply } = useMutation({
    mutationFn: async (applicationId: number) => fetcher(`/applications/${applicationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    }
  });

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const filteredJobs = jobs.filter((job: Job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment = !selectedDepartment || job.department === selectedDepartment;
    const matchesExperience = !selectedExperience || job.experienceLevel === selectedExperience;

    return matchesSearch && matchesDepartment && matchesExperience && job.status === 'active';
  });


  const handleApply = async (jobId: string | number, templateId: string | null) => {
    try {
      setApplyingJobId(Number(jobId));
      console.log('Job ID:', jobId, 'Received assessmentTemplateId:', templateId);
      const templateIdStr = (templateId ?? '').toString().trim();
      console.log('Processed assessmentTemplateId:', templateIdStr);

      if (templateIdStr && templateIdStr !== 'null' && templateIdStr !== 'undefined' && templateIdStr !== '') {
        // Assessment required – redirect to assessment page
        window.location.href = `/assessment/${templateIdStr}?jobId=${jobId}`;
        return;
      }

      // No assessment required – directly submit application
      await fetcher('/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: Number(jobId) })
      });

      // Refetch applications list so Apply button becomes Withdraw etc.
      await refetchApplications();
      alert('Application submitted successfully.');
    } catch (err: any) {
      console.error('Error submitting application:', err);
      alert(err?.message || 'Failed to submit application.');
    } finally {
      setApplyingJobId(null);
    }
  };


  const selectedJob = jobs?.find((job: any) => job.id === selectedJobId);

  if (jobsError || profileError || applicationsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading data:</p>
          <p className="text-red-600">{jobsError?.message || profileError?.message || applicationsError?.message}</p>
        </div>
      </div>
    );
  }

  if (isJobsLoading) {
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
            <img src={logo} alt="NASTP Logo" className="h-20 w-auto" />
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
              <Button variant="ghost" size="sm" onClick={() => handleLogout()}>
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
            <CardContent className="p-6 flex flex-col h-full">
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
                <Card key={job.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{job.title}</h3>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <Building className="h-4 w-4 mr-1" />
                          <span>Company Name</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-600">
                            {job.experienceLevel}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-600">
                            {job.location}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-600">
                            {job.department}
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Job Description</h4>
                      <p className="text-sm text-gray-600 leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {job.description || 'No description provided'}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 mt-auto pt-4">
                      <div className="flex gap-2">
                            {/* Preview dialog */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-200 w-24 justify-center">
                                  Preview
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>{job.title}</DialogTitle>
                                </DialogHeader>
                                <p className="text-sm text-muted-foreground mb-2">{job.location} • {job.department} • {job.experienceLevel}</p>
                                <p className="text-sm mb-4"><strong>Assessment:</strong> {job.assessmentTemplateId ? 'Required' : 'None'}</p>
                                <p className="whitespace-pre-line leading-relaxed mb-4">
                                  {job.description || 'No description provided'}
                                </p>
                                {/* Show other details added by admin */}
                                {Object.entries(job).map(([key, value]) => {
                                  const hidden = ['id','title','description','assessmentTemplateId','status','postedAt','department','location','experienceLevel'];
                                  if (hidden.includes(key)) return null;
                                  if (value === null || typeof value === 'object') return null;
                                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
                                  let displayVal: any = value;
                                  if ((key === 'createdAt' || key === 'postedAt') && typeof value === 'string') {
                                    const d = new Date(value);
                                    if (!isNaN(d.valueOf())) {
                                      displayVal = d.toLocaleDateString();
                                    }
                                  }
                                  return (
                                    <p key={key} className="text-sm text-gray-700"><strong>{label}:</strong> {displayVal}</p>
                                  );
                                })}
                              </DialogContent>
                            </Dialog>
                        {applyingJobId === job.id ? (
                          <Button disabled className="bg-primary/60 text-white w-24 justify-center">
                            Applying...
                          </Button>
                        ) : (
                          (applications?.some((app: Application) => app.jobId === job.id) || job.id === justAppliedJobId) ? (
                            <Button
                              variant="outline"
                              disabled
                              className="bg-green-100 text-green-700 hover:bg-green-100 w-24 justify-center"
                            >
                              Applied
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleApply(job.id, job.assessmentTemplateId)}
                              disabled={applyingJobId === job.id}
                              className="bg-primary text-white hover:brightness-110 transition-all duration-150 w-24 justify-center"
                            >
                              Apply
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
        <ChatbotWidget />
      </div>
    </div>
  );
}
