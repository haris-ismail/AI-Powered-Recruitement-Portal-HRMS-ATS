import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthMigration } from '@/lib/auth-migration';
import { 
  BarChart3, 
  Briefcase, 
  Users, 
  Calendar, 
  Clock, 
  Bell,
  LogOut,
  FileText,
  TrendingUp,
  Users as UsersIcon,
  Target,
  Award
} from "lucide-react";
import logo from "@/assets/NASTPLogo.png";
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
Chart.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

interface AnalyticsData {
  avgScores: Array<{
    template_id: number;
    template_title: string;
    avg_score_percentage: number;
    pass_rate: number;
  }>;
  questionDifficulty: Array<{
    question_id: number;
    correct_pct: number;
  }>;
  candidateTrends: Array<{
    candidate_id: number;
    started_at: string;
    score_percentage: number;
  }>;
  jobCorrelation: Array<{
    template_id: number;
    template_title: string;
    job_id: number;
    score_percentage: number;
    application_status: string;
  }>;
}

export default function AssessmentAnalyticsPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuthMigration();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/assessment-analytics")
      .then(res => res.json())
      .then(setData)
      .catch(error => {
        console.error("Error fetching analytics:", error);
        // Mock data for demonstration
        setData({
          avgScores: [
            { template_id: 1, template_title: "JavaScript Fundamentals", avg_score_percentage: 75.5, pass_rate: 68.2 },
            { template_id: 2, template_title: "React Development", avg_score_percentage: 82.3, pass_rate: 74.1 },
            { template_id: 3, template_title: "Node.js Backend", avg_score_percentage: 71.8, pass_rate: 62.5 }
          ],
          questionDifficulty: [
            { question_id: 1, correct_pct: 0.85 },
            { question_id: 2, correct_pct: 0.72 },
            { question_id: 3, correct_pct: 0.91 },
            { question_id: 4, correct_pct: 0.63 },
            { question_id: 5, correct_pct: 0.78 }
          ],
          candidateTrends: [
            { candidate_id: 1, started_at: "2024-01-15", score_percentage: 85 },
            { candidate_id: 2, started_at: "2024-01-16", score_percentage: 72 },
            { candidate_id: 3, started_at: "2024-01-17", score_percentage: 91 },
            { candidate_id: 4, started_at: "2024-01-18", score_percentage: 68 },
            { candidate_id: 5, started_at: "2024-01-19", score_percentage: 79 }
          ],
          jobCorrelation: [
            { template_id: 1, template_title: "JavaScript Fundamentals", job_id: 101, score_percentage: 85, application_status: "Hired" },
            { template_id: 1, template_title: "JavaScript Fundamentals", job_id: 102, score_percentage: 72, application_status: "Rejected" },
            { template_id: 2, template_title: "React Development", job_id: 103, score_percentage: 91, application_status: "Hired" },
            { template_id: 2, template_title: "React Development", job_id: 104, score_percentage: 68, application_status: "Interview" },
            { template_id: 3, template_title: "Node.js Backend", job_id: 105, score_percentage: 79, application_status: "Pending" }
          ]
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Prepare chart data
  const avgScoresChart = data ? {
    labels: data.avgScores.map(item => item.template_title || `Template ${item.template_id}`),
    datasets: [{
      label: 'Average Score (%)',
      data: data.avgScores.map(item => {
        const score = item.avg_score_percentage;
        return isNaN(score) || score === null || score === undefined ? 0 : score;
      }),
      backgroundColor: 'rgba(99, 102, 241, 0.6)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 2
    }]
  } : undefined;

  const passRateChart = data ? {
    labels: data.avgScores.map(item => item.template_title || `Template ${item.template_id}`),
    datasets: [{
      label: 'Pass Rate (%)',
      data: data.avgScores.map(item => {
        const rate = item.pass_rate;
        return isNaN(rate) || rate === null || rate === undefined ? 0 : rate;
      }),
      backgroundColor: 'rgba(16, 185, 129, 0.6)',
      borderColor: 'rgba(16, 185, 129, 1)',
      borderWidth: 2
    }]
  } : undefined;

  const questionDifficultyChart = data ? {
    labels: data.questionDifficulty.map(item => `Q${item.question_id}`),
    datasets: [{
      label: 'Correct Answer Rate (%)',
      data: data.questionDifficulty.map(item => (item.correct_pct || 0) * 100),
      backgroundColor: 'rgba(251, 191, 36, 0.6)',
      borderColor: 'rgba(251, 191, 36, 1)',
      borderWidth: 2
    }]
  } : undefined;

  const candidateTrendsChart = data ? {
    labels: data.candidateTrends.map(item => new Date(item.started_at).toLocaleDateString()),
    datasets: [{
      label: 'Candidate Score (%)',
      data: data.candidateTrends.map(item => item.score_percentage || 0),
      backgroundColor: 'rgba(139, 92, 246, 0.6)',
      borderColor: 'rgba(139, 92, 246, 1)',
      borderWidth: 2,
      fill: false
    }]
  } : undefined;

  // Calculate summary statistics
  const totalAssessments = data?.candidateTrends?.length || 0;
  const avgOverallScore = data?.avgScores && data.avgScores.length > 0 
    ? data.avgScores.reduce((sum, item) => {
        const score = item.avg_score_percentage;
        return sum + (isNaN(score) || score === null || score === undefined ? 0 : score);
      }, 0) / data.avgScores.length 
    : 0;
  const avgPassRate = data?.avgScores && data.avgScores.length > 0 
    ? (() => {
        console.log('Debug: avgScores data:', data.avgScores);
        const validRates = data.avgScores
          .map(item => {
            const rate = item.pass_rate;
            console.log(`Debug: Template ${item.template_id} pass_rate:`, rate, 'Type:', typeof rate);
            return isNaN(rate) || rate === null || rate === undefined ? 0 : Number(rate);
          })
          .filter(rate => rate >= 0);
        console.log('Debug: Valid rates:', validRates);
        const total = validRates.reduce((sum, rate) => sum + rate, 0);
        const average = validRates.length > 0 ? total / validRates.length : 0;
        console.log('Debug: Total:', total, 'Count:', validRates.length, 'Average:', average);
        return average;
      })()
    : 0;
  const totalQuestions = data?.questionDifficulty?.length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading analytics data...</div>
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
            <Link href="/admin" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
              <BarChart3 className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            <Link href="/admin/jobs" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
              <Briefcase className="h-5 w-5" />
              <span>Job Management</span>
            </Link>
            <Link href="/admin/pipeline" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
              <Users className="h-5 w-5" />
              <span>Recruitment Pipeline</span>
            </Link>
            <Link href="/admin/resume-search" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
              <FileText className="h-5 w-5" />
              <span>Resume Search</span>
            </Link>
            <Link href="/admin/email-templates" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
              <Calendar className="h-5 w-5" />
              <span>Email Templates</span>
            </Link>
            <Link href="/admin/assessment-templates" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
              <FileText className="h-5 w-5" />
              <span>Assessment Templates</span>
            </Link>
            <Link href="/admin/assessment-categories" className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
              <FileText className="h-5 w-5" />
              <span>Assessment Categories</span>
            </Link>
            <Link href="/admin/assessment-analytics" className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-primary text-white">
              <BarChart3 className="h-5 w-5" />
              <span>Assessment Analytics</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessment Analytics</h1>
            <p className="text-gray-600">Comprehensive insights into assessment performance and candidate trends</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <UsersIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Assessments</p>
                    <p className="text-2xl font-bold text-gray-900">{totalAssessments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Score (%)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isNaN(avgOverallScore) ? '0.0%' : avgOverallScore.toFixed(1) + '%'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Target className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pass Rate (%)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isNaN(avgPassRate) ? '0.0%' : avgPassRate.toFixed(1) + '%'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Award className="h-6 w-6 text-purple-600" />
                  </div>
    <div>
                    <p className="text-sm font-medium text-gray-600">Total Questions</p>
                    <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Average Scores Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Average Scores by Template (%)</CardTitle>
              </CardHeader>
              <CardContent>
                {avgScoresChart && (
                  <Bar 
                    data={avgScoresChart} 
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: false },
                        tooltip: { mode: 'index', intersect: false }
                      },
                      scales: {
                        y: { beginAtZero: true, max: 100 }
                      }
                    }} 
                  />
                )}
              </CardContent>
            </Card>

            {/* Pass Rate Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Pass Rates by Template</CardTitle>
              </CardHeader>
              <CardContent>
                {passRateChart && (
                  <Bar 
                    data={passRateChart} 
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: false },
                        tooltip: { mode: 'index', intersect: false }
                      },
                      scales: {
                        y: { beginAtZero: true, max: 100 }
                      }
                    }} 
                  />
                )}
              </CardContent>
            </Card>

            {/* Question Difficulty Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Question Difficulty Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {questionDifficultyChart && (
                  <Bar 
                    data={questionDifficultyChart} 
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: false },
                        tooltip: { mode: 'index', intersect: false }
                      },
                      scales: {
                        y: { beginAtZero: true, max: 100 }
                      }
                    }} 
                  />
                )}
              </CardContent>
            </Card>

            {/* Candidate Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Candidate Score Trends (%)</CardTitle>
              </CardHeader>
              <CardContent>
                {candidateTrendsChart && (
                  <Line 
                    data={candidateTrendsChart} 
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: false },
                        tooltip: { mode: 'index', intersect: false }
                      },
                      scales: {
                        y: { beginAtZero: true, max: 100 }
                      }
                    }} 
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assessment/Job Correlation Table */}
            <Card>
              <CardHeader>
                <CardTitle>Assessment/Job Correlation</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.jobCorrelation.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.template_title || `Template ${row.template_id}`}</TableCell>
                        <TableCell>#{row.job_id}</TableCell>
                        <TableCell>
                          <Badge variant={(row.score_percentage || 0) >= 80 ? "default" : (row.score_percentage || 0) >= 60 ? "secondary" : "destructive"}>
                            {(row.score_percentage || 0).toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              row.application_status === "Hired" ? "default" : 
                              row.application_status === "Interview" ? "secondary" : 
                              row.application_status === "Pending" ? "outline" : "destructive"
                            }
                          >
                            {row.application_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Question Difficulty Table */}
            <Card>
              <CardHeader>
                <CardTitle>Question Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Difficulty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.questionDifficulty.map((row, i) => {
                      const successRate = (row.correct_pct || 0) * 100;
                      const difficulty = successRate >= 80 ? "Easy" : successRate >= 60 ? "Medium" : "Hard";
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">Q{row.question_id}</TableCell>
                          <TableCell>{successRate.toFixed(1)}%</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                difficulty === "Easy" ? "default" : 
                                difficulty === "Medium" ? "secondary" : "destructive"
                              }
                            >
                              {difficulty}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
} 