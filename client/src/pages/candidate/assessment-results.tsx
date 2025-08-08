import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, LogOut } from "lucide-react";
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

  const user = getCurrentUser();

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
    if (!jobId) return;
    
    try {
      setSubmitting(true);
      await fetcher('/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: Number(jobId) })
      });
      
      // Remember job locally so Jobs page can immediately show "Applied"
      localStorage.setItem('justAppliedJob', jobId.toString());
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Link href="/candidate/jobs">
            <Button>Back to Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No results found.</p>
          <Link href="/candidate/jobs">
            <Button>Back to Jobs</Button>
          </Link>
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
            <Badge className="bg-accent text-white">Assessment Results</Badge>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">
                {user?.email}
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

      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Results Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {result.passed ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <span>Assessment Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{result.score}</div>
                <div className="text-sm text-gray-500">Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{result.maxScore}</div>
                <div className="text-sm text-gray-500">Maximum Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round((result.score / result.maxScore) * 100)}%
                </div>
                <div className="text-sm text-gray-500">Percentage</div>
              </div>
            </div>
            
            <div className="flex items-center justify-center mb-4">
              <Badge variant={result.passed ? "default" : "destructive"} className="text-lg px-4 py-2">
                {result.passed ? "PASSED" : "FAILED"}
              </Badge>
            </div>
            <div className="text-center text-sm text-gray-600">
              <p>Passing requirement: {Math.round((result.score / result.maxScore) * 100)}% achieved</p>
              <p>Score: {result.score} out of {result.maxScore} points</p>
            </div>
          </CardContent>
        </Card>

        {/* Question Review */}
        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {result.questions.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      Question {index + 1}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {question.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="text-sm text-gray-500">
                        {question.pointsEarned} / {question.pointsEarned} points
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{question.questionText}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Your Answer:</span>
                      <p className="text-gray-800 mt-1">
                        {Array.isArray(question.yourAnswer) 
                          ? question.yourAnswer.join(", ") 
                          : question.yourAnswer || "No answer provided"}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Correct Answer:</span>
                      <p className="text-gray-800 mt-1">
                        {Array.isArray(question.correctAnswers) 
                          ? question.correctAnswers.join(", ") 
                          : question.correctAnswers}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Application Submission */}
        {jobId && !submitted && (
          <Card className="mt-8">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  {result.passed 
                    ? "Congratulations! You passed the assessment. Submit your application to continue."
                    : "Assessment completed. You can still submit your application."
                  }
                </p>
                <Button 
                  onClick={handleSubmitApplication} 
                  disabled={submitting}
                  className="w-full md:w-auto"
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {submitted && (
          <Card className="mt-8 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-800 mb-2">
                  Application Submitted Successfully!
                </h3>
                <p className="text-green-700">
                  Your application has been submitted. You can track your application status in your dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="mt-8 text-center">
          <Link href="/candidate/jobs">
            <Button variant="outline" className="mr-4">
              Back to Jobs
            </Button>
          </Link>
          <Link href="/candidate/applications">
            <Button variant="outline">
              View Applications
            </Button>
          </Link>
        </div>
      </div>
      <ChatbotWidget />
    </div>
  );
} 