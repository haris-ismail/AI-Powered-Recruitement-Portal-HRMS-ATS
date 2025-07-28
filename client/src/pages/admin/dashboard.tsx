import { useState, useEffect } from 'react';
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuthMigration } from '@/lib/auth-migration';
import { 
  BarChart3, 
  Briefcase, 
  Users, 
  Calendar, 
  Clock, 
  Bell,
  LogOut,
  ChevronUp,
  FileText
} from "lucide-react";
import logo from "@/assets/NASTPLogo.png";
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
Chart.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

// Add these interfaces at the top of the file
interface Application {
  id: number;
  jobId: number;
  status: string;
  appliedAt: string;
  updatedAt?: string;
  // Add other fields as needed
}

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

interface Stats {
  activeJobs: number;
  totalApplications: number;
  interviews: number;
  timeToHire: number;
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuthMigration();

  // Fetch new analytics KPIs
  const { data: kpis } = useQuery<any>({
    queryKey: ['/api/dashboard/kpis'],
  });
  // Fetch chart data
  const { data: timeToHireData } = useQuery<any[]>({
    queryKey: ['/api/dashboard/visuals/time-to-hire'],
  });
  const { data: sourceOfHireData } = useQuery<any>({
    queryKey: ['/api/dashboard/visuals/source-of-hire'],
  });
  const { data: offerAcceptanceData } = useQuery<any[]>({
    queryKey: ['/api/dashboard/visuals/offer-acceptance'],
  });

  // Prepare chart data
  const timeToHireChart = timeToHireData ? {
    labels: timeToHireData.map((d: any) => `Job #${d.jobId}`),
    datasets: [{
      label: 'Avg. Time to Hire (days)',
      data: timeToHireData.map((d: any) => d.avgTimeToHire),
      backgroundColor: 'rgba(99, 102, 241, 0.6)',
    }],
  } : undefined;

  const sourceOfHireChart = sourceOfHireData ? {
    labels: Object.keys(sourceOfHireData),
    datasets: [{
      label: 'Source of Hire',
      data: Object.values(sourceOfHireData),
      backgroundColor: [
        'rgba(99, 102, 241, 0.6)',
        'rgba(16, 185, 129, 0.6)',
        'rgba(251, 191, 36, 0.6)',
        'rgba(239, 68, 68, 0.6)',
        'rgba(139, 92, 246, 0.6)'
      ],
    }],
  } : undefined;

  const offerAcceptanceChart = offerAcceptanceData ? {
    labels: offerAcceptanceData.map((d: any) => `Job #${d.jobId}`),
    datasets: [{
      label: 'Offer Acceptance Rate (%)',
      data: offerAcceptanceData.map((d: any) => d.acceptanceRate),
      backgroundColor: 'rgba(16, 185, 129, 0.6)',
    }],
  } : undefined;

  const { data: applications } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
  });

  const { data: jobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const recentApplications = applications?.slice(0, 5) || [];
  const activeJobs = jobs?.filter((job: any) => job.status === 'active')?.slice(0, 3) || [];

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
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-primary text-white">
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
            <Link href="/admin/resume-search">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
                <FileText className="h-5 w-5" />
                <span>Resume Search</span>
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
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
            <p className="text-gray-600">Recruitment analytics and key metrics</p>
          </div>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">Jobs Posted</p>
                <p className="text-3xl font-bold text-gray-900">{kpis?.totalJobs ?? '-'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">Total Hires</p>
                <p className="text-3xl font-bold text-gray-900">{kpis?.totalHires ?? '-'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">Avg. Time to Hire</p>
                <p className="text-3xl font-bold text-gray-900">{kpis?.avgTimeToHire ? kpis.avgTimeToHire.toFixed(1) : '-'}</p>
                <span className="text-sm text-gray-500">days</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">Offer Acceptance Rate</p>
                <p className="text-3xl font-bold text-gray-900">{kpis?.offerAcceptanceRate ? kpis.offerAcceptanceRate.toFixed(1) : '-'}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">Cost per Hire</p>
                <p className="text-3xl font-bold text-gray-900">{kpis?.costPerHire ? `Rs. ${kpis.costPerHire.toLocaleString()}` : '-'}</p>
              </CardContent>
            </Card>
          </div>
          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader><CardTitle>Time-to-Hire Trend</CardTitle></CardHeader>
              <CardContent>{timeToHireChart ? <Bar data={timeToHireChart} /> : <p>Loading...</p>}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Source of Hire</CardTitle></CardHeader>
              <CardContent>{sourceOfHireChart ? <Pie data={sourceOfHireChart} /> : <p>Loading...</p>}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Offer Acceptance Rate</CardTitle></CardHeader>
              <CardContent>{offerAcceptanceChart ? <Bar data={offerAcceptanceChart} /> : <p>Loading...</p>}</CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Applications */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {recentApplications.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No applications yet</p>
                ) : (
                  <div className="space-y-4">
                    {recentApplications.map((application: any) => (
                      <div key={application.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Application #{application.id}</p>
                            <p className="text-sm text-gray-500">Job ID: {application.jobId}</p>
                          </div>
                        </div>
                        <Badge 
                          variant="secondary"
                          className={
                            application.status === 'applied' ? 'bg-blue-100 text-blue-800' :
                            application.status === 'shortlisted' ? 'bg-yellow-100 text-yellow-800' :
                            application.status === 'interview' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {application.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Performing Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>Active Job Postings</CardTitle>
              </CardHeader>
              <CardContent>
                {activeJobs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No active jobs</p>
                ) : (
                  <div className="space-y-4">
                    {activeJobs.map((job: any) => (
                      <div key={job.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="font-medium text-gray-900">{job.title}</p>
                          <p className="text-sm text-gray-500">{job.department}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                          <p className="text-sm text-gray-500 mt-1">{job.location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}