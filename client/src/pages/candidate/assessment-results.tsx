import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, LogOut, User, Briefcase, FileText, BookOpen, Target, Award, CheckCircle, AlertCircle } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { getCurrentUser, removeToken } from "@/lib/auth";
import logo from "@/assets/NASTPLogo.png";
import { ChatbotWidget } from "@/components/ChatbotWidget";

interface Result {
  score: number;
  maxScore: number;
  passed: boolean;
  status: string;
  questions: Array<{
    id: number;
    questionText: string;
    questionType: string;
    yourAnswer: any;
    correctAnswers: any;
    isCorrect: boolean;
    pointsEarned: number;
  }>;
}

export default function AssessmentResultsPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    console.log(`🔍 [RESULTS PAGE] Assessment results page loaded`);
    console.log(`📊 [RESULTS PAGE] Current URL:`, window.location.href);
    
    const params = new URLSearchParams(window.location.search);
    const attemptId = params.get("attemptId");
    const jobIdParam = params.get("jobId");
    
    console.log(`📊 [RESULTS PAGE] URL parameters:`, {
      attemptId,
      jobId: jobIdParam
    });
    
    if (jobIdParam) {
      console.log(`📝 [RESULTS PAGE] Setting job ID: ${jobIdParam}`);
      setJobId(Number(jobIdParam));
    }
    
    if (!attemptId) {
      console.error(`❌ [RESULTS PAGE] No attempt ID provided in URL`);
      setError("No attempt ID provided");
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      console.log(`🚀 [RESULTS PAGE] Starting to fetch results for attempt: ${attemptId}`);
      try {
        setLoading(true);
        setError(null);
        
        console.log(`📞 [RESULTS PAGE] Making API request to fetch results`);
        const response = await fetcher(`/assessments/${attemptId}/results`);
        
        console.log(`✅ [RESULTS PAGE] API request completed`);
        console.log(`📊 [RESULTS PAGE] Response received:`, JSON.stringify(response, null, 2));
        
        if (!response) {
          console.error(`❌ [RESULTS PAGE] No response received from API`);
          throw new Error("Failed to fetch results");
        }
        
        console.log(`📊 [RESULTS PAGE] Setting result data:`, {
          score: response.score,
          maxScore: response.maxScore,
          passed: response.passed,
          status: response.status,
          questionCount: response.questions?.length || 0
        });
        
        setResult(response);
        console.log(`✅ [RESULTS PAGE] Results set successfully`);
      } catch (err: any) {
        console.error(`❌ [RESULTS PAGE] Error fetching assessment results:`, err);
        console.error(`❌ [RESULTS PAGE] Error type:`, typeof err);
        console.error(`❌ [RESULTS PAGE] Error message:`, err.message);
        console.error(`❌ [RESULTS PAGE] Error stack:`, err.stack);
        setError(err.message || "Failed to load assessment results");
      } finally {
        console.log(`🏁 [RESULTS PAGE] Fetch results process completed`);
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  const handleSubmitApplication = async () => {
    if (!jobId) {
      console.error("No job ID available for application submission");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetcher('/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });

      if (response) {
        setSubmitted(true);
        console.log("Application submitted successfully");
      }
    } catch (error) {
      console.error("Error submitting application:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading results...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Results</h3>
            <p className="text-gray-600">{error}</p>
            <Button 
              onClick={() => window.location.href = "/candidate/assessments"} 
              className="mt-4"
            >
              Return to Assessments
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-600">Assessment results could not be loaded.</p>
            <Button 
              onClick={() => window.location.href = "/candidate/assessments"} 
              className="mt-4"
            >
              Return to Assessments
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const percentage = Math.round((result.score / result.maxScore) * 100);

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
                {user ? user.email : 'Loading...'}
              </span>
              <Button variant="ghost" size="sm" onClick={() => {
                removeToken();
                window.location.href = "/login";
              }}>
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
            <Link href="/candidate/profile">
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
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-primary-foreground hover:bg-primary-foreground/10">
                <FileText className="h-5 w-5" />
                <span>My Applications</span>
              </a>
            </Link>
            <Link href="/candidate/assessments">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-primary-foreground text-primary">
                <BookOpen className="h-5 w-5" />
                <span>My Assessments</span>
              </a>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-2">
                <Award className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-gray-900">Assessment Results</h1>
              </div>
              <p className="text-gray-600 text-lg">Your assessment performance summary</p>
            </div>

            {/* Results Summary Card */}
            <Card className="mb-8 border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="text-xl flex items-center space-x-2">
                  {result.passed ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                  <span>Assessment {result.passed ? 'Passed' : 'Completed'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">{result.score}</div>
                    <div className="text-sm text-gray-600">Points Earned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-700 mb-2">{result.maxScore}</div>
                    <div className="text-sm text-gray-600">Total Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">{percentage}%</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Status</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={result.passed ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}
                    >
                      {result.passed ? 'Passed' : 'Not Passed'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Question Results */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Question Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.questions.map((question, index) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="bg-gray-100 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-900">Question {index + 1}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className={question.isCorrect ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}
                          >
                            {question.isCorrect ? 'Correct' : 'Incorrect'}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {question.pointsEarned} pts
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-3">{question.questionText}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Your Answer:</span>
                          <p className="text-gray-600 mt-1">{question.yourAnswer || 'No answer provided'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Correct Answer:</span>
                          <p className="text-gray-600 mt-1">
                            {Array.isArray(question.correctAnswers) 
                              ? question.correctAnswers.join(', ') 
                              : question.correctAnswers || 'N/A'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link href="/candidate/assessments">
                <Button variant="outline" className="w-full sm:w-auto">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Back to Assessments
                </Button>
              </Link>
              
              {jobId && !submitted && (
                <Button 
                  onClick={handleSubmitApplication}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  {submitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit Job Application
                    </>
                  )}
                </Button>
              )}
              
              {submitted && (
                <Button disabled className="w-full sm:w-auto bg-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Application Submitted
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
      <ChatbotWidget />
    </div>
  );
} 