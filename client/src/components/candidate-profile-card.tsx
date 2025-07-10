import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, MapPin, GraduationCap, Briefcase, FileText } from "lucide-react";
import { useState } from "react";
import EmailTemplateSelectModal from "./email-template-select-modal";
import { useLocation } from "wouter";

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
  };
  application: {
    id: number;
    status: string;
    appliedAt: string;
  };
  onStatusChange?: (applicationId: number, newStatus: string) => void;
  onSendEmail?: (candidateId: number) => void;
}

export default function CandidateProfileCard({ 
  candidate, 
  application, 
  onStatusChange, 
  onSendEmail 
}: CandidateProfileCardProps) {
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
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [location, navigate] = useLocation();

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-gray-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {candidate.firstName && candidate.lastName 
                  ? `${candidate.firstName} ${candidate.lastName}`
                  : "Name not provided"}
              </h3>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <Mail className="h-4 w-4 mr-1" />
                {candidate.email || "Email not provided"}
              </div>
            </div>
          </div>
          <Badge className={getStatusColor(application.status)}>
            {application.status}
          </Badge>
        </div>

        <div className="space-y-3 text-sm">
          {candidate.dateOfBirth && (
            <div className="flex items-center text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Born: {new Date(candidate.dateOfBirth).toLocaleDateString()}</span>
            </div>
          )}

          {candidate.city && (
            <div className="flex items-center text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{candidate.city}</span>
            </div>
          )}

          {candidate.education && candidate.education.length > 0 && (
            <div className="flex items-start text-gray-600">
              <GraduationCap className="h-4 w-4 mr-2 mt-0.5" />
              <div>
                <span className="font-medium">Latest Education:</span>
                <p>{candidate.education[0].degree} at {candidate.education[0].institution}</p>
              </div>
            </div>
          )}

          {candidate.experience && candidate.experience.length > 0 && (
            <div className="flex items-start text-gray-600">
              <Briefcase className="h-4 w-4 mr-2 mt-0.5" />
              <div>
                <span className="font-medium">Latest Experience:</span>
                <p>{candidate.experience[0].role} at {candidate.experience[0].company}</p>
              </div>
            </div>
          )}

          {candidate.resumeUrl && (
            <div className="flex items-center text-gray-600">
              <FileText className="h-4 w-4 mr-2" />
              <a 
                href={candidate.resumeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View Resume
              </a>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Applied: {new Date(application.appliedAt).toLocaleDateString()}
            </span>
            <div className="flex space-x-2">
              {/* Updated email button to open modal */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/email/compose?candidateId=${candidate.id}`)}
              >
                <Mail className="h-4 w-4" />
              </Button>
              {nextStatus && onStatusChange && (
                <Button
                  size="sm"
                  onClick={() => onStatusChange(application.id, nextStatus)}
                  className="capitalize"
                >
                  Move to {nextStatus}
                </Button>
              )}
            </div>
          </div>
        </div>
        {/* Email Template Selection Modal */}
        {showTemplateModal && (
          <EmailTemplateSelectModal
            candidate={candidate}
            onClose={() => setShowTemplateModal(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}
