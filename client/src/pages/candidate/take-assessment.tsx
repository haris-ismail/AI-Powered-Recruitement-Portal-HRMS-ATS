import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { removeToken } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { Building, Clock, CheckCircle2, XCircle, AlertCircle, LogOut, X } from "lucide-react";
import logo from "@/assets/NASTPLogo.png";
import { ChatbotWidget } from "@/components/ChatbotWidget";

interface Question {
  id: number;
  questionText: string;
  questionType: string;
  options?: string[];
  correctAnswers?: string[];
  points?: number;
}

export default function TakeAssessmentPage() {
  const [currentPath, navigate] = useLocation();
  const search = window.location.search;
  // Get route params
  const routeParams = useParams();
  
  // Parse URL parameters from both route and search
  const searchParams = React.useMemo(() => {
    console.log('=== Parsing URL Parameters ===');
    console.log('Full URL:', window.location.href);
    console.log('Pathname:', window.location.pathname);
    console.log('Search:', window.location.search);
    console.log('Route Params:', routeParams);
    
    // Get the current URL search params
    const searchParams = new URLSearchParams(window.location.search);
    
    // Log all search parameters
    const allParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      allParams[key] = value;
    });
    console.log('All Search Params:', allParams);
    
    // Get templateId from route params first, then from search params
    const templateId = routeParams.templateId || searchParams.get('templateId');
    console.log('templateId:', templateId, '(from route:', routeParams.templateId, ', from search:', searchParams.get('templateId'), ')');
    
    // Get jobId from route params first, then from search params
    const jobId = routeParams.jobId || searchParams.get('jobId');
    console.log('jobId:', jobId, '(from route:', routeParams.jobId, ', from search:', searchParams.get('jobId'), ')');
    
    // Get attemptId from search params
    // Safely parse attemptId; treat missing or "null" string as null
    const attemptIdRaw = searchParams.get('attemptId');
    const attemptId = attemptIdRaw && attemptIdRaw !== 'null' ? attemptIdRaw : null;
    console.log('attemptId:', attemptId);
    
    const result = {
      templateId,
      attemptId,
      jobId: jobId || null
    };
    
    console.log('Parsed Parameters:', result);
    console.log('==============================');
    
    return result;
  }, [search, routeParams]);
  
  const { templateId, attemptId: attemptIdParam, jobId } = searchParams;
  
  // Log when URL parameters change
  useEffect(() => {
    console.log('URL parameters updated:', { templateId, attemptId: attemptIdParam, jobId });
  }, [templateId, attemptIdParam, jobId]);
  
  // If we have an attemptId but no templateId, we need to fetch the templateId from the attempt
  const [resolvedTemplateId, setResolvedTemplateId] = useState<string | null>(null);

  const { toast } = useToast();
  
  const user = getCurrentUser();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [timer, setTimer] = useState(0);
  // New timer-related state
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string>("");
  const [openResult, setOpenResult] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadAssessment = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Initial values:', { templateId, attemptIdParam, jobId, resolvedTemplateId });
        
        // If we have a templateId, use it directly
        if (templateId) {
          console.log('Using templateId from URL:', templateId);
          const { templateResponse } = await startOrContinueAssessment(templateId);
          
          if (!isMounted) return;
          
          // Process questions from the template response
          if (templateResponse?.questions) {
            const parsedQuestions = templateResponse.questions.map((q: any, index: number) => {
              try {
                // Ensure we have a proper question object
                const question = typeof q === 'string' ? JSON.parse(q) : q;
                
                // Ensure required fields with sensible defaults
                return {
                  id: question.id || `q-${index}`,
                  questionText: question.questionText || question.question || `Question ${index + 1}`,
                  questionType: question.questionType || question.type || 'short_answer',
                  options: Array.isArray(question.options) ? question.options : [],
                  correctAnswers: Array.isArray(question.correctAnswers) ? question.correctAnswers : [],
                  points: typeof question.points === 'number' ? question.points : 1,
                  ...question
                };
              } catch (e) {
                console.error(`Error parsing question at index ${index}:`, e, q);
                return {
                  id: `error-${index}`,
                  questionText: 'Error loading this question',
                  questionType: 'error',
                  error: 'Failed to load question',
                  options: [],
                  correctAnswers: [],
                  points: 0,
                  _raw: q
                };
              }
            });
            
            if (!isMounted) return;
            
            console.log('Parsed questions:', parsedQuestions);
            setQuestions(parsedQuestions);
            
            // Start the timer if duration is provided
            if (templateResponse.durationMinutes) {
              const durationSeconds = templateResponse.durationMinutes * 60;
              console.log(`Setting assessment timer to ${durationSeconds} seconds`);
              setTimer(durationSeconds);
            }
          }
          
          return;
        }
        
        // If we have an attemptId but no templateId, fetch the templateId from the attempt
        if (attemptIdParam) {
          console.log('Fetching template ID from attempt:', attemptIdParam);
          const attemptData = await fetcher(`/api/assessments/attempts/${attemptIdParam}`);
          
          if (!isMounted) return;
          
          if (!attemptData || !attemptData.templateId) {
            throw new Error('Could not determine assessment template from attempt');
          }
          
          const newTemplateId = attemptData.templateId.toString();
          console.log('Resolved templateId from attempt:', newTemplateId);
          
          if (isMounted) {
            setResolvedTemplateId(newTemplateId);
            // No need to call startOrContinueAssessment here, the effect will re-run with resolvedTemplateId
          }
          
          return;
        }
        
        // If we have a resolvedTemplateId from state (from a previous render)
        if (resolvedTemplateId) {
          console.log('Using resolvedTemplateId from state:', resolvedTemplateId);
          await startOrContinueAssessment(resolvedTemplateId);
          return;
        }
        
        // If we get here, we don't have enough information to proceed
        throw new Error("No assessment ID provided. Please start the assessment from the assessments page.");
      } catch (err) {
        if (!isMounted) return;
        const errorMessage = err instanceof Error ? err.message : 'Failed to load assessment';
        console.error('Error in loadAssessment:', errorMessage, err);
        setError(errorMessage);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Helper function to start or continue an assessment
    const startOrContinueAssessment = async (templateId: string) => {
      console.log('=== startOrContinueAssessment ===');
      console.log('templateId:', templateId);
      console.log('jobId from props:', jobId);
      console.log('attemptIdParam:', attemptIdParam);
      
      try {
        // Start or continue assessment attempt
        // Backend expects /api/assessments/start/:templateId
        let startUrl = `/assessments/start/${templateId}`;
        const requestBody: any = {};
        if (jobId) {
          console.log('Including jobId in body:', jobId);
          requestBody.jobId = parseInt(jobId, 10);
        } else {
          console.warn('No jobId provided to startOrContinueAssessment');
        }
        if (attemptIdParam) {
          console.log('Including attemptId in body:', attemptIdParam);
          requestBody.attemptId = attemptIdParam;
        }
        console.log('POST', startUrl, 'body:', requestBody);
        
        console.log('Sending request to start assessment...');
        const startResponse = await fetcher(startUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log('API Response:', startResponse);
        
        if (!isMounted) {
          console.log('Component unmounted, aborting...');
          return null;
        }
        
        if (!startResponse) {
          throw new Error('Empty response from server');
        }
        
        if (!startResponse.attemptId) {
          console.error('Missing attemptId in response:', startResponse);
          throw new Error('Failed to start assessment: Missing attempt ID in response');
        }
        
        // Store the attempt ID
        setAttemptId(startResponse.attemptId);
        
        // Update URL with the new parameters
        const newSearchParams = new URLSearchParams();
        newSearchParams.set('templateId', templateId);
        newSearchParams.set('attemptId', startResponse.attemptId.toString());
        if (jobId) {
          newSearchParams.set('jobId', jobId);
        }
        
        const newUrl = `${window.location.pathname}?${newSearchParams.toString()}`;
        window.history.replaceState({}, '', newUrl);
        
        console.log('Updated URL with parameters:', newUrl);
        
        // Fetch the template with questions
        console.log('Fetching template with ID:', templateId);
        const templateResponse = await fetcher(`/assessment-templates/${templateId}`);
        
        if (!isMounted) return null;
        
        console.log('Template data received:', templateResponse);
        
        if (!templateResponse || !templateResponse.questions) {
          console.error('Invalid template data:', templateResponse);
          throw new Error('Invalid template data: No questions found');
        }
        
        return { startResponse, templateResponse };
        
      } catch (error) {
        console.error('Error in startOrContinueAssessment:', error);
        setError(error instanceof Error ? error.message : 'Failed to start assessment');
        setLoading(false);
        return null;
      }
      
      // Process questions
      const parsedQuestions = templateResponse.questions.map((q: any, index: number) => {
        try {
          // Ensure we have a proper question object
          const question = typeof q === 'string' ? JSON.parse(q) : q;
          
          // Ensure required fields with sensible defaults
          return {
            id: question.id || `q-${index}`,
            questionText: question.questionText || question.question || `Question ${index + 1}`,
            questionType: question.questionType || question.type || 'short_answer',
            options: Array.isArray(question.options) ? question.options : [],
            correctAnswers: Array.isArray(question.correctAnswers) ? question.correctAnswers : [],
            points: typeof question.points === 'number' ? question.points : 1,
            ...question
          };
        } catch (e) {
          console.error(`Error parsing question at index ${index}:`, e, q);
          return {
            id: `error-${index}`,
            questionText: 'Error loading this question',
            questionType: 'error',
            error: 'Failed to load question',
            options: [],
            correctAnswers: [],
            points: 0,
            _raw: q
          };
        }
      });
      
      if (!isMounted) return;
      
      console.log('Parsed questions:', parsedQuestions);
      setQuestions(parsedQuestions);
      
      // Start the timer if duration is provided
      if (templateResponse.durationMinutes) {
        const durationSeconds = templateResponse.durationMinutes * 60;
        console.log(`Setting assessment timer to ${durationSeconds} seconds`);
        setTimer(durationSeconds);
      }
    };

    // Only run the effect if we have either a templateId or an attemptId
    if (templateId || attemptIdParam) {
      loadAssessment();
    } else {
      setError("No assessment ID provided. Please start the assessment from the assessments page.");
      setLoading(false);
    }
    
    return () => {
      isMounted = false;
    };
  }, [templateId, attemptIdParam, jobId, resolvedTemplateId]);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => {
        setTimer(timer - 1);
        // Auto-submit if time runs out
        if (timer === 1) {
          handleSubmit();
        }
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  const handleAnswer = (qid: number, value: any) => {
    setAnswers({ ...answers, [qid]: value });
    
    // Auto-save answer
    apiRequest("POST", `/api/assessments/${attemptId}/answers`, {
      questionId: qid,
      answer: value
    }).catch((err) => {
      console.error("Failed to save answer:", err);
    });
  };

  const handleSubmit = async () => {
    console.log(`🚀 [FRONTEND] Assessment submission started`);
    console.log(`📊 [FRONTEND] Submission details:`, {
      attemptId,
      questionsCount: questions.length,
      answeredQuestions: Object.keys(answers).length,
      jobId
    });
    console.log(`📦 [FRONTEND] Answers to submit:`, JSON.stringify(answers, null, 2));
    
    if (!attemptId) {
      console.error(`❌ [FRONTEND] No attempt ID available`);
      return;
    }
    
    const allAnswered = questions.every(q => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== "");
    console.log(`✅ [FRONTEND] All questions answered: ${allAnswered}`);
    
    if (!allAnswered) {
      console.warn(`⚠️ [FRONTEND] Not all questions answered, showing alert`);
      alert("Please answer all questions before submitting.");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Submit assessment results to backend
      console.log(`📞 [FRONTEND] Making API request to submit assessment`);
      console.log(`📊 [FRONTEND] Request payload:`, {
        answers: answers,
        jobId: jobId
      });
      
      // Add timeout to the request using Promise.race
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 30000); // 30 second timeout
      });
      
      console.log(`⏰ [FRONTEND] Setting up 30-second timeout for submission`);
      const submissionPromise = apiRequest("POST", `/api/assessments/${attemptId}/submit`, {
        answers: answers,
        jobId: jobId // Include jobId for proper linking
      });
      
      console.log(`🔄 [FRONTEND] Racing submission promise against timeout`);
      const response = await Promise.race([submissionPromise, timeoutPromise]) as Response;
      
      console.log(`✅ [FRONTEND] API request completed successfully`);
      console.log(`📊 [FRONTEND] Response status: ${response.status}`);
      console.log(`📊 [FRONTEND] Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [FRONTEND] Response not OK: ${response.status} - ${errorText}`);
        throw new Error(`Failed to submit assessment: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`📊 [FRONTEND] Response data:`, JSON.stringify(result, null, 2));
      
      // Show result message
      const passed = result.passed;
      const score = result.score;
      const maxScore = result.maxScore;
      const msg = passed 
        ? `Passed! (${score}/${maxScore})` 
        : `Assessment Completed (${score}/${maxScore})`;
      
      console.log(`📊 [FRONTEND] Result message: ${msg}`);
      console.log(`📊 [FRONTEND] Assessment passed: ${passed}`);
      console.log(`📊 [FRONTEND] Score: ${score}/${maxScore}`);
      
      setResultMsg(msg);
      setOpenResult(true);
      
      // Submit application regardless of pass/fail
      if (jobId) {
        console.log(`📝 [FRONTEND] Submitting job application for job ID: ${jobId}`);
        try {
          await fetcher('/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: Number(jobId) })
          });
          console.log(`✅ [FRONTEND] Job application submitted successfully`);
          // Remember job locally so Jobs page can immediately show "Applied"
          localStorage.setItem('justAppliedJob', jobId.toString());
        } catch (error) {
          console.error(`❌ [FRONTEND] Error submitting application:`, error);
        }
      }
      
      toast({
        title: "Success",
        description: "Assessment submitted successfully",
      });
      
      console.log(`⏰ [FRONTEND] Setting up redirect to results page in 3 seconds`);
      // Redirect to results page after 3 seconds
      setTimeout(() => {
        console.log(`🔄 [FRONTEND] Redirecting to results page`);
        setOpenResult(false);
        window.location.href = `/assessment-results?attemptId=${attemptId}`;
      }, 3000);
      
    } catch (error: any) {
      console.error(`❌ [FRONTEND] Assessment submission error:`, error);
      console.error(`❌ [FRONTEND] Error type:`, typeof error);
      console.error(`❌ [FRONTEND] Error message:`, error.message);
      console.error(`❌ [FRONTEND] Error stack:`, error.stack);
      
      if (error.message === 'Request timed out') {
        console.error(`⏰ [FRONTEND] Request timed out after 30 seconds`);
        setError('Request timed out. Please try again.');
        toast({
          title: "Timeout Error",
          description: "Assessment submission timed out. Please try again.",
          variant: "destructive"
        });
      } else {
        console.error(`❌ [FRONTEND] Other error occurred:`, error.message);
        setError(error.message);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      }
    } finally {
      console.log(`🏁 [FRONTEND] Assessment submission process completed`);
      setLoading(false);
    }
  };

  return (
    <div>
      
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <img src={logo} alt="NASTP Logo" className="h-20 w-auto" />
            
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

      <main className="flex-1 p-6">
        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading assessment...</p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <Card className="bg-red-50 border-l-4 border-red-400">
                <CardContent>
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-red-700">Error</h3>
                      <p className="text-sm text-red-600 mt-1">{error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Button 
                onClick={() => window.location.href = "/candidate/jobs"} 
                className="w-full"
              >
                Return to Jobs
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Assessment</h2>
                  <p className="mt-1 text-sm text-gray-500">Complete the assessment to proceed with your application</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Clock className={"h-5 w-5 " + (timer > 60 ? 'text-primary' : 'text-red-600')} />
                    <span className={"text-sm " + (timer > 60 ? 'text-primary' : 'text-red-600')}>
                      Time left: {Math.floor(timer/60)}:{(timer%60).toString().padStart(2,'0')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      Question {current + 1} of {questions.length}
                    </span>
                  </div>
                </div>
              </div>

              {questions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Question {current + 1}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-gray-600">{questions[current].questionText}</p>
                      {questions[current].questionType === "mcq_single" && (
                        <div className="space-y-2">
                          {questions[current].options?.map((option: string, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`q${questions[current].id}-${index}`}
                                name={`q${questions[current].id}`}
                                value={option}
                                checked={answers[questions[current].id] === option}
                                 onChange={(e) => handleAnswer(questions[current].id, e.target.value)}
                                className="h-4 w-4 text-primary"
                              />
                              <label htmlFor={`q${questions[current].id}-${index}`} className="text-sm text-gray-700">
                                {option}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                      {questions[current].questionType === "short_answer" && (
                        <div>
                          <textarea
                             onChange={(e) => handleAnswer(questions[current].id, e.target.value)}
                            value={answers[questions[current].id] || ""}
                            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter your answer here..."
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between space-x-4">
                <Button
                  variant="outline"
                  className="w-28 justify-center"
                  onClick={() => setCurrent(current - 1)}
                  disabled={current === 0}
                >
                  Previous
                </Button>
                <div className="flex-1 flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    className="w-28 justify-center"
                    onClick={() => setCurrent(current + 1)}
                    disabled={current === questions.length - 1}
                  >
                    Next
                  </Button>
                  <Button
                    className="w-28 justify-center"
                    onClick={handleSubmit}
                    disabled={loading || questions.some(q => answers[q.id] === undefined || answers[q.id] === "")}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span>Submitting...</span>
                      </div>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      {resultMsg && (
          <Dialog open={openResult} onOpenChange={setOpenResult}>
            <DialogContent className="max-w-sm text-center [&>button]:hidden">
              <DialogHeader>
                <DialogTitle className={resultMsg.startsWith('Passed') ? 'text-green-600' : 'text-red-600'}>
                  {resultMsg.startsWith('Passed') ? (
                    <div className="flex flex-col items-center space-y-2">
                      <CheckCircle2 className="h-10 w-10" />
                      <span>Pass</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <XCircle className="h-10 w-10" />
                      <span>Fail</span>
                    </div>
                  )}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm mt-4">{resultMsg}</p>
            </DialogContent>
          </Dialog>
        )}
      </main>
      <ChatbotWidget />
    </div>
  </div>
  );
} 