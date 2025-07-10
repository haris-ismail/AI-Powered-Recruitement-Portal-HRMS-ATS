import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, removeToken } from "@/lib/auth";
import { 
  BarChart3, 
  Briefcase, 
  Users, 
  Calendar, 
  Clock, 
  Bell,
  LogOut,
  ChevronUp
} from "lucide-react";

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const user = getCurrentUser();

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: applications } = useQuery({
    queryKey: ["/api/applications"],
  });

  const { data: jobs } = useQuery({
    queryKey: ["/api/jobs"],
  });

  const handleLogout = () => {
    removeToken();
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
            <h1 className="text-2xl font-bold text-gray-900">NASTP Recruitment Portal - Admin</h1>
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
            <Link href="/admin/email-templates">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
                <Calendar className="h-5 w-5" />
                <span>Email Templates</span>
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.activeJobs || 0}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <ChevronUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600 font-medium">+12% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Applications</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.totalApplications || 0}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <ChevronUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600 font-medium">+8% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Interviews Scheduled</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.interviews || 0}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm text-red-600 font-medium">-3% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg. Time to Hire</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.timeToHire || 0}</p>
                    <span className="text-sm text-gray-500">days</span>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm text-green-600 font-medium">-2 days improved</span>
                </div>
              </CardContent>
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