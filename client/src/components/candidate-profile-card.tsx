import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, MapPin, GraduationCap, Briefcase, FileText, Star, MessageSquare, Plus, Edit, Trash2, Code, Eye, Layers } from "lucide-react";
import { useState } from "react";
import EmailTemplateSelectModal from "./email-template-select-modal";
import { useLocation } from "wouter";
import { useAuthMigration } from "@/lib/auth-migration";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface CandidateProfileCardProps {
  candidate: {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    dateOfBirth?: string;
    city?: string;
    resumeUrl?: string;
    motivationLetter?: string;
<<<<<<< Updated upstream
    linkedinUrl?: string;
    githubUrl?: string;
=======
<<<<<<< Updated upstream
=======
    linkedin?: string;
    github?: string;
>>>>>>> Stashed changes
>>>>>>> Stashed changes
    education?: Array<{
      degree: string;
      institution: string;
      fromDate: string;
      toDate: string;
    }>;
    experience?: Array<{
      company: string;
      role: string;
      fromDate: string;
      toDate: string;
      skills: string;
    }>;
    skills?: Array<{
      id: number;
      name: string;
      expertiseLevel: number;
    }>;
    projects?: Array<{
      id?: number;
      title: string;
      description: string;
      techStack: string;
      githubUrl: string;
    }>;
  };
  application: {
    id: number;
    status: string;
    appliedAt: string;
    ai_score?: number;
    ai_score_breakdown?: { 
      EducationScore?: number;
      SkillsScore?: number;
      ExperienceYearsScore?: number;
      ExperienceRelevanceScore?: number;
      reasoning?: string;
    };
    red_flags?: string[];
  };
  onStatusChange?: (applicationId: number, newStatus: string) => void;
  onSendEmail?: (candidateId: number) => void;
}

interface CandidateReview {
  id: number;
  candidateId: number;
  applicationId: number;
  reviewerId: number;
  reviewer: {
    email: string;
  };
  stage: string;
  rating: number;
  feedback: string;
  createdAt: string;
  updatedAt: string;
}

export default function CandidateProfileCard({ 
  candidate, 
  application, 
  onStatusChange, 
  onSendEmail 
}: CandidateProfileCardProps) {
  const { user } = useAuthMigration();
  const { toast } = useToast();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [location, navigate] = useLocation();

  // Admin Notes State
  const [noteText, setNoteText] = useState("");
  const [noteScore, setNoteScore] = useState("");
  const [editNoteId, setEditNoteId] = useState<number | null>(null);
  const [editNoteText, setEditNoteText] = useState("");
  const [editNoteScore, setEditNoteScore] = useState("");

  // Reviews State
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewRating, setReviewRating] = useState([3]);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewStage, setReviewStage] = useState("");
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [editingReview, setEditingReview] = useState<CandidateReview | null>(null);
  const [reviewForm, setReviewForm] = useState({
    stage: '',
    rating: 5,
    feedback: ''
  });
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [customWeights, setCustomWeights] = useState({
    EducationScore: 0.5,
    SkillsScore: 0.3,
    ExperienceYearsScore: 0.1,
    ExperienceRelevanceScore: 0.1,
  });
  const [regenResult, setRegenResult] = useState<any>(null);

  // Fetch notes (admin only)
  const { data: notes, refetch: refetchNotes, error: notesError } = useQuery({
    queryKey: ["/api/candidates", candidate.id, "notes"],
    enabled: user?.role === 'admin',
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/candidates/${candidate.id}/notes`);
      return res.json();
    },
    retry: false,
  });

  // Fetch reviews (admin only)
  const { data: reviews, refetch: refetchReviews, error: reviewsError } = useQuery({
    queryKey: ["/api/applications", application.id, "reviews"],
    enabled: user?.role === 'admin',
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/applications/${application.id}/reviews`);
      return res.json();
    },
    retry: false,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/candidates/${candidate.id}/notes`, {
        note: noteText,
        score: noteScore ? Number(noteScore) : undefined,
      });
    },
    onSuccess: () => {
      setNoteText("");
      setNoteScore("");
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", candidate.id, "notes"] });
    },
  });

  // Edit note mutation
  const editNoteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/candidates/${candidate.id}/notes/${editNoteId}`, {
        note: editNoteText,
        score: editNoteScore ? Number(editNoteScore) : undefined,
      });
    },
    onSuccess: () => {
      setEditNoteId(null);
      setEditNoteText("");
      setEditNoteScore("");
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", candidate.id, "notes"] });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      await apiRequest("DELETE", `/api/candidates/${candidate.id}/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", candidate.id, "notes"] });
    },
  });

  // Add/Edit review mutation
  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (editingReview) {
        await apiRequest("PUT", `/api/applications/${application.id}/reviews/${editingReview.id}`, {
          stage: reviewStage,
          rating: reviewRating[0],
          feedback: reviewFeedback,
        });
      } else {
        await apiRequest("POST", `/api/applications/${application.id}/reviews`, {
          candidateId: candidate.id,
          stage: reviewStage,
          rating: reviewRating[0],
          feedback: reviewFeedback,
        });
      }
    },
    onSuccess: () => {
      setShowReviewDialog(false);
      setReviewRating([3]);
      setReviewFeedback("");
      setEditingReview(null);
      setReviewStage(application.status);
      queryClient.invalidateQueries({ queryKey: ["/api/applications", application.id, "reviews"] });
    },
    onError: (error: any) => {
      alert(
        error?.message ||
        "Failed to submit review. Please check your input or try again later."
      );
    }
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      await apiRequest("DELETE", `/api/applications/${application.id}/reviews/${reviewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", application.id, "reviews"] });
    },
  });

  // Admin: Regenerate AI score mutation
  const handleRegenerateScore = async () => {
    setRegenLoading(true);
    setRegenError("");
    try {
      const res = await apiRequest("POST", `/api/applications/${application.id}/regenerate-score`, {
        weights: customWeights,
      });
      const data = await res.json();
      setRegenResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
    } catch (err: any) {
      setRegenError(err?.message || "Failed to regenerate score");
    } finally {
      setRegenLoading(false);
    }
  };

  const handleAddReview = () => {
    setEditingReview(null);
    setReviewRating([3]);
    setReviewFeedback("");
    setReviewStage(application.status);
    setShowReviewDialog(true);
  };

  const handleEditReview = (review: CandidateReview) => {
    setEditingReview(review);
    setReviewRating([review.rating]);
    setReviewFeedback(review.feedback);
    setReviewStage(review.stage);
    setShowReviewDialog(true);
  };

  const handleSubmitReview = () => {
    if (reviewFeedback.trim()) {
      reviewMutation.mutate();
    }
  };

  const getCurrentUserReview = () => {
    return reviews?.find((review: CandidateReview) => review.reviewerId === user?.id);
  };

  const getStageLabel = (stage: string) => {
    const stageLabels: { [key: string]: string } = {
      applied: "Applied",
      shortlisted: "Shortlisted", 
      interview: "Interview",
      hired: "Hired",
      onboarded: "Onboarded",
      rejected: "Rejected"
    };
    return stageLabels[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    const colors: { [key: string]: string } = {
      applied: "bg-blue-100 text-blue-800",
      shortlisted: "bg-yellow-100 text-yellow-800",
      interview: "bg-green-100 text-green-800",
      hired: "bg-purple-100 text-purple-800",
      onboarded: "bg-indigo-100 text-indigo-800",
      rejected: "bg-red-100 text-red-800"
    };
    return colors[stage] || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied": return "bg-blue-100 text-blue-800";
      case "shortlisted": return "bg-yellow-100 text-yellow-800";
      case "interview": return "bg-green-100 text-green-800";
      case "hired": return "bg-purple-100 text-purple-800";
      case "onboarded": return "bg-indigo-100 text-indigo-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "applied": return "shortlisted";
      case "shortlisted": return "interview";
      case "interview": return "hired";
      case "hired": return "onboarded";
      default: return null;
    }
  };

  const nextStatus = getNextStatus(application.status);

  // Add error boundary
  if (!candidate || !application) {
    console.error("Missing required props:", { candidate, application });
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <p className="text-red-600">Error: Missing candidate or application data</p>
        </CardContent>
      </Card>
    );
  }
  console.log("CandidateProfileCard candidate prop:", candidate);

  return (
    <Card className="w-full relative">
      {/* AI Score at top right */}
      {typeof application.ai_score === 'number' && (
        <div className="absolute top-4 right-4 bg-primary text-white rounded-full px-4 py-1 text-sm font-bold shadow">
          Job match: {application.ai_score}%
        </div>
      )}
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-gray-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {candidate?.firstName && candidate?.lastName ? `${candidate.firstName} ${candidate.lastName}` : "Name not provided"}
              </h3>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <Mail className="h-4 w-4 mr-1" /> {candidate?.email || "Email not provided"}
              </div>
            </div>
          </div>
          <Badge className={getStatusColor(application.status)}>
            {application.status}
          </Badge>
        </div>

        <div className="space-y-3 text-sm">
          {candidate?.dateOfBirth && (
            <div className="flex items-center text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Born: {new Date(candidate.dateOfBirth).toLocaleDateString()}</span>
            </div>
          )}

          {candidate?.city && (
            <div className="flex items-center text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{candidate.city}</span>
            </div>
          )}

          {candidate?.education && candidate.education.length > 0 && (
            <div className="flex items-start text-gray-600">
              <GraduationCap className="h-4 w-4 mr-2 mt-0.5" />
              <div className="flex-1">
                <span className="font-medium">Latest Education:</span>
                <div className="mt-1 p-2 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="font-medium text-gray-900">{candidate.education[0].degree}</div>
                  <div className="text-sm text-gray-600">{candidate.education[0].institution}</div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>{candidate.education[0].fromDate} - {candidate.education[0].toDate}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {candidate?.experience && candidate.experience.length > 0 && (
            <div className="flex items-start text-gray-600">
              <Briefcase className="h-4 w-4 mr-2 mt-0.5" />
              <div className="flex-1">
                <span className="font-medium">Latest Experience:</span>
                <div className="mt-1 p-2 bg-green-50 rounded-lg border border-green-100">
                  <div className="font-medium text-gray-900">{candidate.experience[0].role}</div>
                  <div className="text-sm text-gray-600">{candidate.experience[0].company}</div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>{candidate.experience[0].fromDate} - {candidate.experience[0].toDate}</span>
                  </div>
                  {candidate.experience[0].skills && (
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                      <Code className="h-3 w-3" />
                      <span className="text-blue-600">{candidate.experience[0].skills}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {candidate?.resumeUrl && (
            <div className="flex items-center text-gray-600">
              <FileText className="h-4 w-4 mr-2" />
              <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" >
                View Resume
              </a>
            </div>
          )}

          {/* Cover Letter Section */}
          {candidate?.motivationLetter && (
            <div className="flex items-start text-gray-600">
              <FileText className="h-4 w-4 mr-2 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Cover Letter:</span>
                  <Dialog open={showCoverLetterModal} onOpenChange={setShowCoverLetterModal}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center space-x-1 h-6 text-xs">
                        <Eye className="h-3 w-3" />
                        <span>View Full</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          <FileText className="h-5 w-5" />
                          <span>Cover Letter</span>
                        </DialogTitle>
                      </DialogHeader>
                      <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                        {candidate.motivationLetter}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {candidate.motivationLetter}
                </div>
              </div>
            </div>
          )}

          {/* Skills Section */}
          {candidate?.skills && candidate.skills.length > 0 && (
            <div className="flex items-start text-gray-600">
              <Code className="h-4 w-4 mr-2 mt-0.5" />
              <div className="flex-1">
                <span className="font-medium">Skills:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {candidate.skills.map((skill: any, index: number) => (
                    <div key={index} className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      <Star className="h-3 w-3" />
                      <span>{skill.name}</span>
                      <span className="text-blue-600">({["Beginner", "", "Intermediate", "", "Expert"][skill.expertiseLevel-1]})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
<<<<<<< Updated upstream
=======
<<<<<<< Updated upstream
=======
>>>>>>> Stashed changes

          {/* Projects Section */}
          {candidate?.projects && candidate.projects.length > 0 && (
            <div className="flex items-start text-gray-600">
              <Layers className="h-4 w-4 mr-2 mt-0.5" />
              <div className="flex-1">
                <span className="font-medium">Projects:</span>
                <div className="space-y-2 mt-1">
                  {candidate.projects.map((project: any, index: number) => (
                    <div key={index} className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="font-medium text-gray-900">{project.title}</div>
                      {project.description && (
                        <div className="text-sm text-gray-600 mt-1">{project.description}</div>
                      )}
                      {project.techStack && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <Code className="h-3 w-3" />
                          <span className="text-purple-600">{project.techStack}</span>
                        </div>
                      )}
<<<<<<< Updated upstream
                      {project.githubUrl && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                            View on GitHub
                          </a>
                        </div>
                      )}
=======
                                             {project.githubUrl && (
                         <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                           <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                             <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                           </svg>
                           <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                             View on GitHub
                           </a>
                         </div>
                       )}
>>>>>>> Stashed changes
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
<<<<<<< Updated upstream
=======
>>>>>>> Stashed changes
>>>>>>> Stashed changes
        </div>

        {/* AI Score Breakdown Section */}
        {application.ai_score_breakdown && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-blue-900 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                AI Score Breakdown
              </h4>
              <div className="flex items-center space-x-2">
                {typeof application.ai_score === 'number' && (
                  <div className="text-sm font-bold text-blue-700">
                    Total: {application.ai_score}%
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="h-6 w-6 p-0"
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </div>
            </div>
            
            {showBreakdown && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="text-sm font-medium text-gray-700">Education</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${(application.ai_score_breakdown.EducationScore || 0) * 10}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{application.ai_score_breakdown.EducationScore || 0}/10</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="text-sm font-medium text-gray-700">Skills</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${(application.ai_score_breakdown.SkillsScore || 0) * 10}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{application.ai_score_breakdown.SkillsScore || 0}/10</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="text-sm font-medium text-gray-700">Experience Years</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full" 
                          style={{ width: `${(application.ai_score_breakdown.ExperienceYearsScore || 0) * 10}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{application.ai_score_breakdown.ExperienceYearsScore || 0}/10</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="text-sm font-medium text-gray-700">Experience Relevance</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${(application.ai_score_breakdown.ExperienceRelevanceScore || 0) * 10}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{application.ai_score_breakdown.ExperienceRelevanceScore || 0}/10</span>
                    </div>
                  </div>
                </div>
                
                {/* AI Reasoning Section */}
                {application.ai_score_breakdown?.reasoning && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-800">AI Reasoning</span>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed max-h-32 overflow-y-auto">
                      {application.ai_score_breakdown.reasoning.split('\n').map((line, index) => (
                        <p key={index} className="mb-1">
                          {line.trim()}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                

                
                {/* Red Flags Section */}
                {application.red_flags && (
                  Array.isArray(application.red_flags) ? (
                    application.red_flags.length > 0 && application.red_flags[0] !== "None" && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium text-red-800">Red Flags</span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">{application.red_flags.join(", ")}</p>
                      </div>
                    )
                  ) : (
                    application.red_flags !== "None" && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium text-red-800">Red Flags</span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">{application.red_flags}</p>
                      </div>
                    )
                  )
                )}
              </>
            )}
          </div>
        )}

        {/* Reviews Section */}
        {user?.role === 'admin' && (
          <div className="mt-6">
            {reviewsError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-600">Error loading reviews: {reviewsError.message}</p>
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 flex items-center">
                <Star className="h-4 w-4 mr-2" />
                Panel Reviews
              </h4>
              <Button 
                size="sm" 
                onClick={handleAddReview}
                className="flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span>Add Review</span>
              </Button>
            </div>

            {reviews && reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review: CandidateReview) => (
                  <div key={review.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getStageColor(review.stage)}>
                          {getStageLabel(review.stage)}
                        </Badge>
                        <span className="text-sm text-gray-600"> by {review.reviewer?.email || "Unknown"} </span>
                        {review.reviewerId === user?.id && (
                          <Badge variant="outline" className="text-xs"> Your Review </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        {review.reviewerId === user?.id && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditReview(review)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteReviewMutation.mutate(review.id)}
                              className="h-6 w-6 p-0 text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {review.rating}/5
                      </span>
                    </div>
                    {review.feedback && (
                      <p className="text-sm text-gray-700">{review.feedback}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No reviews yet
              </p>
            )}
          </div>
        )}

        {/* Admin Notes Section */}
        {user?.role === 'admin' && (
          <div className="mt-6">
            {notesError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-600">Error loading notes: {notesError.message}</p>
              </div>
            )}
            <Separator className="my-4" />
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              Internal Notes
            </h4>

            {/* Add Note Form */}
            <div className="space-y-3 mb-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Score (1-10)"
                  min="1"
                  max="10"
                  value={noteScore}
                  onChange={(e) => setNoteScore(e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  size="sm"
                  onClick={() => addNoteMutation.mutate()}
                  disabled={!noteText.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Display Notes */}
            {notes && notes.length > 0 && (
              <div className="space-y-2">
                {notes.map((note: any) => (
                  <div key={note.id} className="border rounded-lg p-3 bg-gray-50">
                    {editNoteId === note.id ? (
                      <div className="space-y-2">
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={editNoteText}
                            onChange={(e) => setEditNoteText(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={editNoteScore}
                            onChange={(e) => setEditNoteScore(e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => editNoteMutation.mutate()}
                            disabled={!editNoteText.trim()}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditNoteId(null);
                              setEditNoteText("");
                              setEditNoteScore("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{note.note}</p>
                          {note.score && (
                            <span className="text-xs text-gray-500">Score: {note.score}/10</span>
                          )}
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditNoteId(note.id);
                              setEditNoteText(note.note);
                              setEditNoteScore(note.score?.toString() || "");
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNoteMutation.mutate(note.id)}
                            className="h-6 w-6 p-0 text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <div className="flex space-x-2">
            {nextStatus && (
              <Button
                size="sm"
                onClick={() => {
                  console.log("Status change button clicked:", { applicationId: application.id, currentStatus: application.status, nextStatus });
                  onStatusChange?.(application.id, nextStatus);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Move to {nextStatus}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTemplateModal(true)}
            >
              Send Email
            </Button>
          </div>
        </div>

        {/* AI analyzed red flags at the bottom */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="font-bold text-lg text-gray-800 mb-1">AI analyzed red flags:</div>
          <div className="text-sm text-red-600 min-h-[1.5em]">
            {Array.isArray(application.red_flags)
              ? application.red_flags.join(", ")
              : (application.red_flags ?? "None")}
          </div>
        </div>
      </CardContent>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingReview ? "Edit Review" : "Add Review"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="stage">Stage</Label>
              <select
                id="stage"
                value={reviewStage}
                onChange={(e) => setReviewStage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="applied">Applied</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview</option>
                <option value="hired">Hired</option>
                <option value="onboarded">Onboarded</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="rating">Rating: {reviewRating[0]}/5</Label>
              <Slider
                id="rating"
                value={reviewRating}
                onValueChange={setReviewRating}
                max={5}
                min={1}
                step={1}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder="Provide detailed feedback..."
                className="mt-2"
                rows={4}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowReviewDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={!reviewFeedback.trim() || reviewMutation.isPending}
              >
                {reviewMutation.isPending ? "Saving..." : (editingReview ? "Update" : "Submit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

             {/* Email Template Modal */}
       {showTemplateModal && (
         <EmailTemplateSelectModal
           candidate={candidate}
           onClose={() => setShowTemplateModal(false)}
         />
       )}
    </Card>
  );
}
