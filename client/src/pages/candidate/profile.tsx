import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentUser, logout } from "@/lib/auth";
import { 
  User, 
  Briefcase, 
  FileText, 
  LogOut,
  Plus,
  Trash2,
  Upload,
  Calendar,
  MapPin,
  GraduationCap,
  Building,
  Save,
  CheckCircle,
  Mail,
  Phone,
  Globe,
  Award,
  Code,
  BookOpen,
  Clock,
  ExternalLink,
  Eye,
  Star,
  Zap,
  Target,
  School,
  Workflow,
  Layers,
  Activity,
  Edit,
  X,
  Github,
  AlertCircle
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import logo from "@/assets/NASTPLogo.png";
import { ChatbotWidget } from "@/components/ChatbotWidget";

function isProfileComplete(profile: any) {
  // Define required fields for completeness
  const basicInfoComplete = (
    profile?.firstName &&
    profile?.lastName &&
    profile?.dateOfBirth &&
    profile?.apartment &&
    profile?.street &&
    profile?.area &&
    profile?.city &&
    profile?.province &&
    profile?.postalCode &&
    profile?.cnic &&
    profile?.resumeUrl &&
    profile?.motivationLetter
  );

  // At least one education entry is required
  const educationComplete = profile?.education && 
    Array.isArray(profile.education) && 
    profile.education.length > 0 &&
    profile.education.every((edu: any) => 
      edu.degree && edu.institution && edu.fromDate && edu.toDate
    );

  // Experience and projects are optional (new graduates may not have them)
  // But if they exist, they should be properly filled
  const experienceValid = !profile?.experience || 
    (Array.isArray(profile.experience) && 
     profile.experience.every((exp: any) => 
       !exp.company || (exp.company && exp.role && exp.fromDate && exp.toDate)
     ));

  const projectsValid = !profile?.projects || 
    (Array.isArray(profile.projects) && 
     profile.projects.every((proj: any) => 
       !proj.title || (proj.title && proj.description)
     ));

  return basicInfoComplete && educationComplete && experienceValid && projectsValid;
}

function ProfileCard({ profile, educationList, experienceList, skills, onEdit }: any) {
  console.log("ProfileCard received profile:", profile); // Debug log
  
  // Add null check to prevent errors
  if (!profile) {
    return (
      <Card className="mb-6">
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  console.log("ProfileCard resumeText:", profile.resumeText); // Debug log
  
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Profile</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-4">
          {profile.profilePicture ? (
            <img src={profile.profilePicture} alt="Profile" className="h-20 w-20 rounded-full object-cover border mr-4" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 mr-4">
              <User className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div>
            {/* CNIC, Name, Date of Birth, Email */}
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">CNIC:</span>
            </div>
            <div className="ml-6">{profile.cnic}</div>
            <div className="flex items-center space-x-2 mb-2 mt-3">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">Name:</span>
            </div>
            <div className="ml-6">{profile.firstName} {profile.lastName}</div>
            <div className="flex items-center space-x-2 mb-2 mt-3">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">Date of Birth:</span>
            </div>
            <div className="ml-6">{profile.dateOfBirth}</div>
            <div className="flex items-center space-x-2 mb-2 mt-3">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">Email:</span>
            </div>
            <div className="ml-6">{profile.email}</div>
          </div>
          <div>
            {/* Address */}
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">Address:</span>
            </div>
            <div className="ml-6">
              <div>{profile.apartment}, {profile.street}, {profile.area}</div>
              <div>{profile.city}, {profile.province}, {profile.postalCode}</div>
            </div>
            {/* Social Links (moved here) */}
            {(profile.linkedin || profile.github) && (
              <div className="mt-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <span className="font-semibold">Social Links:</span>
                </div>
                <div className="ml-6 space-y-1">
                  {profile.linkedin && (
                    <div className="flex items-center space-x-2">
                      <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                  {profile.github && (
                    <div className="flex items-center space-x-2">
                      <svg className="h-4 w-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      <a href={profile.github} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:underline text-sm">
                        GitHub Profile
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">Cover Letter:</span>
        </div>
            {profile.motivationLetter && (
              <Dialog open={showCoverLetterModal} onOpenChange={setShowCoverLetterModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center space-x-1">
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
                    {profile.motivationLetter}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="ml-6">
            {profile.motivationLetter ? (
              <div className="text-gray-700 text-sm line-clamp-3">
                {profile.motivationLetter}
              </div>
            ) : (
              <span className="italic text-gray-400">Not provided</span>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <GraduationCap className="h-4 w-4 text-gray-500" />
            <span className="font-semibold">Education:</span>
        </div>
          <div className="ml-6">
            {educationList && educationList.length > 0 ? (
              <div className="space-y-2">
                {educationList.map((edu: any, i: number) => (
                  <div key={i} className="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg">
                    <School className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{edu.degree}</div>
                      <div className="text-sm text-gray-600">{edu.institution}</div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{edu.fromDate} - {edu.toDate}</span>
                        {edu.obtainedMarks && edu.totalMarks && (
                          <>
                            <span>•</span>
                            <span>CGPA: {edu.obtainedMarks}/{edu.totalMarks}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="italic text-gray-400">No education info</span>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Building className="h-4 w-4 text-gray-500" />
            <span className="font-semibold">Experience:</span>
        </div>
          <div className="ml-6">
            {experienceList && experienceList.length > 0 ? (
              <div className="space-y-2">
                {experienceList.map((exp: any, i: number) => (
                  <div key={i} className="flex items-start space-x-2 p-2 bg-gray-50 rounded-lg">
                    <Workflow className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{exp.role}</div>
                      <div className="text-sm text-gray-600">{exp.company}</div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{exp.fromDate} - {exp.toDate}</span>
                      </div>
                      {exp.skills && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <Code className="h-3 w-3" />
                          <span className="text-blue-600">{exp.skills}</span>
                        </div>
                      )}
                      {exp.description && exp.description.length > 0 && (
                        <div className="text-sm text-gray-600 mt-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="line-clamp-1">
                                • {Array.isArray(exp.description) ? exp.description[0] : exp.description}
                              </div>
                            </div>
                            {Array.isArray(exp.description) && exp.description.length > 1 && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="flex items-center space-x-1 ml-2">
                                    <Eye className="h-3 w-3" />
                                    <span>View Full</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center space-x-2">
                                      <Workflow className="h-5 w-5" />
                                      <span>Experience Details</span>
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-2">
                                    <div className="font-medium text-gray-900">{exp.role}</div>
                                    <div className="text-sm text-gray-600">{exp.company}</div>
                                    <div className="text-xs text-gray-500">
                                      {exp.fromDate} - {exp.toDate}
                                    </div>
                                    <div className="mt-3">
                                      <div className="font-medium text-gray-900 mb-2">Description:</div>
                                      <div className="space-y-1">
                                        {Array.isArray(exp.description) ? exp.description.map((bullet: string, i: number) => (
                                          <div key={i} className="flex items-start space-x-2">
                                            <span className="text-gray-500 mt-1">•</span>
                                            <span className="text-gray-700">{bullet}</span>
                                          </div>
                                        )) : (
                                          <div className="flex items-start space-x-2">
                                            <span className="text-gray-500 mt-1">•</span>
                                            <span className="text-gray-700">{exp.description}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="italic text-gray-400">No experience info</span>
            )}
          </div>
        </div>
        
        {/* Projects Section */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Layers className="h-4 w-4 text-gray-500" />
            <span className="font-semibold">Projects:</span>
          </div>
          <div className="ml-6">
            {profile.projects && profile.projects.length > 0 ? (
              <div className="space-y-2">
                {profile.projects.map((project: any, index: number) => (
                  <div key={index} className="flex items-start space-x-2 p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                    <Layers className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{project.title}</div>
                      {project.description && project.description.length > 0 && (
                        <div className="text-sm text-gray-600 mt-1">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="line-clamp-1">
                                • {Array.isArray(project.description) ? project.description[0] : project.description}
                              </div>
                            </div>
                            {Array.isArray(project.description) && project.description.length > 1 && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="flex items-center space-x-1 ml-2">
                                    <Eye className="h-3 w-3" />
                                    <span>View Full</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center space-x-2">
                                      <Layers className="h-5 w-5" />
                                      <span>Project Details</span>
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-2">
                                    <div className="font-medium text-gray-900">{project.title}</div>
                                    <div className="mt-3">
                                      <div className="font-medium text-gray-900 mb-2">Description:</div>
                                      <div className="space-y-1">
                                        {Array.isArray(project.description) ? project.description.map((bullet: string, bulletIndex: number) => (
                                          <div key={bulletIndex} className="flex items-start space-x-2">
                                            <span className="text-gray-500 mt-1">•</span>
                                            <span className="text-gray-700">{bullet}</span>
                                          </div>
                                        )) : (
                                          <div className="flex items-start space-x-2">
                                            <span className="text-gray-500 mt-1">•</span>
                                            <span className="text-gray-700">{project.description}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      )}
                      {project.techStack && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <Code className="h-3 w-3" />
                          <span className="text-purple-600">{project.techStack}</span>
                        </div>
                      )}
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
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="italic text-gray-400">No projects added</span>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="font-semibold">Resume:</span>
          </div>
          <div className="ml-6">
          {profile.resumeUrl ? (
              <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center space-x-1">
                <ExternalLink className="h-3 w-3" />
                <span>View Resume</span>
              </a>
            ) : (
              <span className="italic text-gray-400">Not uploaded</span>
            )}
        </div>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="h-4 w-4 text-gray-500" />
            <span className="font-semibold">Skills:</span>
            </div>
          <div className="ml-6">
            {skills && skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill: any, i: number) => (
                  <div key={i} className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-2 rounded-lg border border-blue-100">
                    <Code className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-gray-900">{skill.name}</span>
                    <span className="text-xs text-blue-600 font-medium">
                      ({["Beginner", "", "Intermediate", "", "Expert"][skill.expertiseLevel-1]})
                    </span>
        </div>
                ))}
              </div>
            ) : (
              <span className="italic text-gray-400">No skills added</span>
            )}
          </div>
        </div>
        
        <Button type="button" onClick={onEdit} className="mt-2 flex items-center space-x-2">
          <Edit className="h-4 w-4" />
          <span>Edit Profile</span>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function CandidateProfile() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  


  // Load user data on component mount
  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);
  
  // Add CNIC to profileData state
  const [profileData, setProfileData] = useState({
    cnic: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    apartment: "",
    street: "",
    area: "",
    city: "",
    province: "",
    postalCode: "",
    motivationLetter: "",
    resumeUrl: "",
    profilePicture: "",
    resumeText: "",
    linkedin: "",
    github: "",
    projects: []
  });

  const [educationList, setEducationList] = useState([
    {
      id: undefined as number | undefined,
      degree: "",
      institution: "",
      fromDate: "",
      toDate: "",
      totalMarks: "",
      obtainedMarks: ""
    }
  ]);

  const [experienceList, setExperienceList] = useState([
    {
      id: undefined as number | undefined,
      company: "",
      role: "",
      fromDate: "",
      toDate: "",
      skills: "",
      description: [""] // Changed to array for bullet points
    }
  ]);

  // Add state for projects
  const [projectsList, setProjectsList] = useState([
    {
      id: undefined as number | undefined,
      title: "",
      description: [""], // Changed to array for bullet points
      techStack: "",
      githubUrl: ""
    }
  ]);

  // Add state for skills
  const [skills, setSkills] = useState<any[]>([]);
  
  const [isEditing, setIsEditing] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  const { data: profileQueryData, isLoading } = useQuery<any>({
    queryKey: ["/api/profile"],
  });

  // Fetch skills for the candidate
  const { data: skillsData, refetch: refetchSkills } = useQuery<any[]>({
    queryKey: ["/api/skills"],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!profileQueryData // Only fetch skills when profile is loaded
  });
  useEffect(() => {
    if (Array.isArray(skillsData)) setSkills(skillsData);
  }, [skillsData]);


  // Add mutations for skills
  const createSkillMutation = useMutation({
    mutationFn: async (skill: { name: string; expertiseLevel: number }) => {
      const response = await apiRequest("POST", "/api/skills", skill);
      return response.json();
    },
    onSuccess: () => refetchSkills(),
  });
  const updateSkillMutation = useMutation({
    mutationFn: async ({ id, ...skill }: { id: number; name: string; expertiseLevel: number }) => {
      const response = await apiRequest("PUT", `/api/skills/${id}`, skill);
      return response.json();
    },
    onSuccess: () => refetchSkills(),
  });
  const deleteSkillMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/skills/${id}`, {});
    },
    onSuccess: () => refetchSkills(),
  });
  // Add handlers for skill form
  const [newSkill, setNewSkill] = useState<{ name: string; expertiseLevel: number }>({ name: "", expertiseLevel: 3 });
  const handleAddSkill = () => {
    if (!newSkill.name) return;
    createSkillMutation.mutate(newSkill);
    setNewSkill({ name: "", expertiseLevel: 3 });
  };
  const handleUpdateSkill = (id: number, updated: { name: string; expertiseLevel: number }) => {
    updateSkillMutation.mutate({ id, ...updated });
  };
  const handleDeleteSkill = (id: number) => {
    deleteSkillMutation.mutate(id);
  };

  // Add mutations for projects
  const createProjectMutation = useMutation({
    mutationFn: async (project: { title: string; description: string; techStack?: string; githubUrl?: string }) => {
      const response = await apiRequest("POST", "/api/projects", project);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, ...project }: { id: number; title: string; description: string; techStack?: string; githubUrl?: string }) => {
      const response = await apiRequest("PUT", `/api/projects/${id}`, project);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  useEffect(() => {
    if (profileQueryData) {
      console.log('🔍 [FRONTEND] profileQueryData received:', JSON.stringify(profileQueryData, null, 2));
      console.log('🔍 [FRONTEND] Social links in profileQueryData - linkedin:', profileQueryData?.linkedin, 'github:', profileQueryData?.github);
      
      // Always update education and experience lists
      setEducationList(profileQueryData?.education || []);
      
      // Convert experience descriptions to arrays if they're not already
      const processedExperience = (profileQueryData?.experience || []).map((exp: any) => ({
        ...exp,
        description: Array.isArray(exp.description) ? exp.description : 
                   (exp.description ? JSON.parse(exp.description) : [""])
      }));
      setExperienceList(processedExperience);
      
      // Convert project descriptions to arrays if they're not already
      const processedProjects = (profileQueryData?.projects || []).map((project: any) => ({
        ...project,
        description: Array.isArray(project.description) ? project.description : 
                   (project.description ? JSON.parse(project.description) : [""])
      }));
      setProjectsList(processedProjects);
      
      setResumeText(profileQueryData?.resumeText || "");
      
      // Only update profile data if we're not currently editing
      // This prevents form data from being reset when education/experience is added
      if (!isEditing) {
        // Extract only the fields that should be editable, excluding system fields
        const {
          id,
          userId,
          createdAt,
          updatedAt,
          ...editableFields
        } = profileQueryData;
        
        const newProfileData = {
          cnic: editableFields.cnic || "",
          firstName: editableFields.firstName || "",
          lastName: editableFields.lastName || "",
          dateOfBirth: editableFields.dateOfBirth || "",
          apartment: editableFields.apartment || "",
          street: editableFields.street || "",
          area: editableFields.area || "",
          city: editableFields.city || "",
          province: editableFields.province || "",
          postalCode: editableFields.postalCode || "",
          motivationLetter: editableFields.motivationLetter || "",
          resumeUrl: editableFields.resumeUrl || "",
          profilePicture: editableFields.profilePicture || "",
          resumeText: editableFields.resumeText || "",
          linkedin: editableFields.linkedin || "",
          github: editableFields.github || "",
          projects: editableFields.projects || []
        };
        
        console.log('🔍 [FRONTEND] Setting profileData:', JSON.stringify(newProfileData, null, 2));
        console.log('🔍 [FRONTEND] Social links in newProfileData - linkedin:', newProfileData.linkedin, 'github:', newProfileData.github);
        
        setProfileData(newProfileData);
      }
      
      // Initialize isEditing based on profile completeness only once
      if (isEditing === undefined) {
        if (isProfileComplete(profileQueryData)) {
          setIsEditing(false);
        } else {
          setIsEditing(true);
          // Show welcome popup for new candidates
          if (!profileQueryData.firstName && !profileQueryData.lastName) {
            setShowWelcomePopup(true);
          }
        }
      }
    }
  }, [profileQueryData, isEditing]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      // Set editing to false to show the profile card
      setIsEditing(false);
      
      // Invalidate the query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const createEducationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/education", data);
      return response.json();
    },
    onSuccess: () => {
      // Don't invalidate profile query immediately to prevent form reset
      // The local state is updated in handleEducationSubmit instead
    },
  });

  const updateEducationMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      const response = await apiRequest("PUT", `/api/education/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Don't invalidate profile query immediately to prevent form reset
      // The local state is updated in handleEducationSubmit instead
    },
  });

  const deleteEducationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/education/${id}`, {});
    },
    onSuccess: () => {
      // Don't invalidate profile query immediately to prevent form reset
      // The local state is updated in removeEducation instead
    },
  });

  const createExperienceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/experience", data);
      return response.json();
    },
    onSuccess: () => {
      // Don't invalidate profile query immediately to prevent form reset
      // The local state is updated in handleExperienceSubmit instead
    },
  });

  const updateExperienceMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      const response = await apiRequest("PUT", `/api/experience/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Don't invalidate profile query immediately to prevent form reset
      // The local state is updated in handleExperienceSubmit instead
    },
  });

  const deleteExperienceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/experience/${id}`, {});
    },
    onSuccess: () => {
      // Don't invalidate profile query immediately to prevent form reset
      // The local state is updated in removeExperience instead
    },
  });

  const uploadResumeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/upload-resume", {
        method: "POST",
        credentials: "include",
        body: formData
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }
      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      console.log("Resume upload response:", data); // Debug log
      toast({
        title: "Success",
        description: "Resume uploaded successfully",
      });
      setProfileData(prev => ({ ...prev, resumeUrl: data.resumeUrl, resumeText: data.resumeText }));
      setResumeText(data.resumeText || "");
      console.log("Updated resumeText:", data.resumeText); // Debug log
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload resume",
        variant: "destructive",
      });
    },
  });

  // Add profile picture upload mutation
  const uploadProfilePictureMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/upload-profile-picture", {
        method: "POST",
        credentials: "include",
        body: formData
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Profile picture uploaded successfully",
      });
      setProfileData(prev => ({ ...prev, profilePicture: data.profilePicture }));
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive",
      });
    },
  });

  // Extract resume text mutation
  const extractResumeTextMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/extract-resume-text", {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to extract resume text");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Resume text extracted successfully",
      });
      setProfileData(prev => ({ ...prev, resumeText: data.resumeText }));
      setResumeText(data.resumeText || "");
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to extract resume text",
        variant: "destructive",
      });
    },
  });

  // Add CNIC validation to handleProfileSubmit
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{14}$/.test(profileData.cnic)) {
      setError("CNIC must be exactly 14 digits");
      return;
    }
    if (!user?.email) {
      setError("Email is missing. Please log in again.");
      return;
    }
    if (!isProfileComplete({ ...profileData, email: user.email, education: educationList, experience: experienceList, projects: projectsList })) {
      setError("Please fill all required fields to save your profile.");
      return;
    }
    
    // Validate URLs if provided
    if (profileData.linkedin && !profileData.linkedin.startsWith('http://') && !profileData.linkedin.startsWith('https://')) {
      setError("LinkedIn URL must start with http:// or https://");
      return;
    }
    if (profileData.github && !profileData.github.startsWith('http://') && !profileData.github.startsWith('https://')) {
      setError("GitHub URL must start with http:// or https://");
      return;
    }
    
    setError("");
    
    const dataToSend = { 
        ...profileData, 
        email: user.email,
        education: educationList,
        experience: experienceList,
        projects: projectsList
    };
    
    console.log('🔍 [FRONTEND] Sending profile data:', JSON.stringify(dataToSend, null, 2));
    console.log('🔍 [FRONTEND] Data types:', Object.entries(dataToSend).map(([key, value]) => `${key}: ${typeof value}`));
    console.log('🔍 [FRONTEND] Social links check - linkedin:', (dataToSend as any).linkedin, 'github:', (dataToSend as any).github);
    console.log('🔍 [FRONTEND] profileData state:', JSON.stringify(profileData, null, 2));
    try {
      await updateProfileMutation.mutateAsync(dataToSend);
      // setIsEditing(false) is now handled in the mutation's onSuccess callback
    } catch (err: any) {
      console.error('❌ [FRONTEND] Profile update error:', err);
      console.error('❌ [FRONTEND] Error response:', err?.response?.data);
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to update profile");
      }
    }
  };

  const handleEducationSubmit = async (education: any, index: number) => {
    try {
      if (education.id) {
        // Update existing education
        const updatedEducation = await updateEducationMutation.mutateAsync({
          id: education.id,
          degree: education.degree,
          institution: education.institution,
          fromDate: education.fromDate,
          toDate: education.toDate,
          totalMarks: education.totalMarks,
          obtainedMarks: education.obtainedMarks
        });
        
        // Update the local state with the updated education
        const newEducationList = [...educationList];
        newEducationList[index] = updatedEducation;
        setEducationList(newEducationList);
        
        // Show success message
        toast({
          title: "Success",
          description: "Education updated successfully",
        });
      } else {
        // Create new education
        const createdEducation = await createEducationMutation.mutateAsync(education);
        
        // Update the local state with the created education (including the ID)
        const newEducationList = [...educationList];
        newEducationList[index] = createdEducation;
        setEducationList(newEducationList);
        
        // Show success message
        toast({
          title: "Success",
          description: "Education added successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save education",
        variant: "destructive",
      });
    }
  };

  const handleExperienceSubmit = async (experience: any, index: number) => {
    try {
      if (experience.id) {
        // Update existing experience
        const updatedExperience = await updateExperienceMutation.mutateAsync({
          id: experience.id,
          company: experience.company,
          role: experience.role,
          fromDate: experience.fromDate,
          toDate: experience.toDate,
          skills: experience.skills,
          description: experience.description
        });
        
        // Update the local state with the updated experience
        const newExperienceList = [...experienceList];
        newExperienceList[index] = updatedExperience;
        setExperienceList(newExperienceList);
        
        // Show success message
        toast({
          title: "Success",
          description: "Experience updated successfully",
        });
      } else {
        // Create new experience
        const createdExperience = await createExperienceMutation.mutateAsync(experience);
        
        // Update the local state with the created experience (including the ID)
        const newExperienceList = [...experienceList];
        newExperienceList[index] = createdExperience;
        setExperienceList(newExperienceList);
        
        // Show success message
        toast({
          title: "Success",
          description: "Experience added successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save experience",
        variant: "destructive",
      });
    }
  };

  const addEducation = () => {
    setEducationList([...educationList, {
      id: undefined,
      degree: "",
      institution: "",
      fromDate: "",
      toDate: "",
      totalMarks: "",
      obtainedMarks: ""
    }]);
  };

  const removeEducation = async (index: number) => {
    const education = educationList[index];
    if (education.id) {
      await deleteEducationMutation.mutateAsync(education.id);
    }
    setEducationList(educationList.filter((_, i) => i !== index));
  };

  const addExperience = () => {
    setExperienceList([...experienceList, {
      id: undefined,
      company: "",
      role: "",
      fromDate: "",
      toDate: "",
      skills: "",
      description: [""] // Changed to array for bullet points
    }]);
  };

  const removeExperience = async (index: number) => {
    const experience = experienceList[index];
    if (experience.id) {
      await deleteExperienceMutation.mutateAsync(experience.id);
    }
    setExperienceList(experienceList.filter((_, i) => i !== index));
  };

  const addProject = () => {
    setProjectsList([...projectsList, {
      id: undefined,
      title: "",
      description: [""], // Changed to array for bullet points
      techStack: "",
      githubUrl: ""
    }]);
  };

  const removeProject = (index: number) => {
    const project = projectsList[index];
    if (project.id) {
      deleteProjectMutation.mutate(project.id);
    } else {
      setProjectsList(projectsList.filter((_, i) => i !== index));
    }
  };

  const handleProjectSubmit = async (project: any, index: number) => {
    if (!project.title || !project.description) {
      return;
    }

    if (project.id) {
      // Update existing project
      updateProjectMutation.mutate({
        id: project.id,
        title: project.title,
        description: project.description,
        techStack: project.techStack,
        githubUrl: project.githubUrl
      });
    } else {
      // Create new project
      createProjectMutation.mutate({
        title: project.title,
        description: project.description,
        techStack: project.techStack,
        githubUrl: project.githubUrl
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append("resume", file);
      uploadResumeMutation.mutate(formData);
    }
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append("profilePicture", file);
      uploadProfilePictureMutation.mutate(formData);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };


  if (isLoading || updateProfileMutation.isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isLoading ? "Loading profile..." : "Saving profile..."}
          </p>
        </div>
      </div>
    );
  }

  // Show card if profile is complete and not editing
  if (!isEditing && profileQueryData && isProfileComplete({ ...profileQueryData, email: user?.email })) {
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
                  {profileQueryData?.firstName && profileQueryData?.lastName 
                    ? `${profileQueryData.firstName} ${profileQueryData.lastName}`
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
          <aside className="w-64 bg-primary shadow-sm min-h-screen border-r border-primary-foreground/10">
            <nav className="p-4 space-y-2">
              <Link href="/candidate/profile">
                <a className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-primary-foreground text-primary">
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
                <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-primary-foreground hover:bg-primary-foreground/10">
                  <FileText className="h-5 w-5" />
                  <span>My Assessments</span>
                </a>
              </Link>
            </nav>
          </aside>
          {/* Main Content */}
          <main className="flex-1 p-6">
            {/* Profile Completion Banner */}
            {profileQueryData && (
              <div className="mb-6">
                {isProfileComplete(profileQueryData) ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 font-medium">Profile Complete!</span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      Your profile is complete and you can now apply for jobs.
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <span className="text-yellow-800 font-medium">Profile Incomplete</span>
                    </div>
                    <p className="text-yellow-700 text-sm mt-1">
                      Please complete all required fields to apply for jobs. Required fields include:
                    </p>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Personal Information (Name, Date of Birth, Address)</li>
                        <li>CNIC</li>
                        <li>Resume Upload</li>
                        <li>Motivation Letter</li>
                        <li>At least one Education entry</li>
                      </ul>
                      <p className="mt-2 text-xs">
                        Note: Experience and Projects are optional for new graduates.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h2>
              <p className="text-gray-600">Complete your profile to apply for jobs</p>
            </div>
            {profileQueryData ? (
              <ProfileCard 
                profile={{ 
                  ...profileQueryData, 
                  email: user?.email,
                  projects: projectsList,
                  linkedin: profileQueryData.linkedin,
                  github: profileQueryData.github
                }}
                educationList={educationList} 
                experienceList={experienceList} 
                skills={skills}
                onEdit={() => setIsEditing(true)} 
              />
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">Loading profile...</p>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  // ... existing code for form ...
  // Wrap form in a fragment and add a Cancel button if editing
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
                {profileQueryData?.firstName && profileQueryData?.lastName 
                  ? `${profileQueryData.firstName} ${profileQueryData.lastName}`
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
        <aside className="w-64 bg-primary shadow-sm min-h-screen border-r border-primary-foreground/10">
          <nav className="p-4 space-y-2">
            <Link href="/candidate/profile">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-primary-foreground text-primary">
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
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-primary-foreground hover:bg-primary-foreground/10">
                <FileText className="h-5 w-5" />
                <span>My Assessments</span>
              </a>
            </Link>
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Profile Completion Banner */}
          {profileQueryData && (
            <div className="mb-6">
              {isProfileComplete(profileQueryData) ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 font-medium">Profile Complete!</span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    Your profile is complete and you can now apply for jobs.
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-yellow-800 font-medium">Profile Incomplete</span>
                  </div>
                  <p className="text-yellow-700 text-sm mt-1">
                    Please complete all required fields to apply for jobs. Required fields include:
                  </p>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Personal Information (Name, Date of Birth, Address)</li>
                      <li>CNIC</li>
                      <li>Resume Upload</li>
                      <li>Motivation Letter</li>
                      <li>At least one Education entry</li>
                    </ul>
                    <p className="mt-2 text-xs">
                      Note: Experience and Projects are optional for new graduates.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h2>
            <p className="text-gray-600">Complete your profile to apply for jobs</p>
          </div>
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-2 text-sm">{error}</div>
            )}
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Profile Picture</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  {profileQueryData?.profilePicture ? (
                    <img src={profileQueryData.profilePicture} alt="Profile" className="h-20 w-20 rounded-full object-cover border" />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                      <User className="h-8 w-8" />
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Upload className="h-4 w-4 text-gray-500" />
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleProfilePictureUpload}
                      className="text-sm"
                  />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Personal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="cnic" className="flex items-center space-x-2">
                    <Target className="h-4 w-4" />
                    <span>CNIC</span>
                  </Label>
                  <Input
                    id="cnic"
                    value={profileData.cnic}
                    onChange={(e) => setProfileData({ ...profileData, cnic: e.target.value.replace(/[^\d]/g, "") })}
                    placeholder="12345678901234"
                    maxLength={14}
                    minLength={14}
                    disabled={!!profileData.cnic}
                  />
                </div>
                <div>
                  <Label htmlFor="firstName" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>First Name</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Last Name</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth" className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Date of Birth</span>
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin" className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    <span>LinkedIn URL</span>
                  </Label>
                  <Input
                    id="linkedin"
                    type="url"
                    value={profileData.linkedin}
                    onChange={e => setProfileData({ ...profileData, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
                <div>
                  <Label htmlFor="github" className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span>GitHub URL</span>
                  </Label>
                  <Input
                    id="github"
                    type="url"
                    value={profileData.github}
                    onChange={e => setProfileData({ ...profileData, github: e.target.value })}
                    placeholder="https://github.com/yourusername"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Address</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="apartment" className="flex items-center space-x-2">
                    <Building className="h-4 w-4" />
                    <span>Apartment/Unit</span>
                  </Label>
                  <Input
                    id="apartment"
                    value={profileData.apartment}
                    onChange={(e) => setProfileData({ ...profileData, apartment: e.target.value })}
                    placeholder="Apt 4B"
                  />
                </div>
                <div>
                  <Label htmlFor="street" className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>Street</span>
                  </Label>
                  <Input
                    id="street"
                    value={profileData.street}
                    onChange={(e) => setProfileData({ ...profileData, street: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <Label htmlFor="area" className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>Area</span>
                  </Label>
                  <Input
                    id="area"
                    value={profileData.area}
                    onChange={(e) => setProfileData({ ...profileData, area: e.target.value })}
                    placeholder="Downtown"
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>City</span>
                  </Label>
                  <Input
                    id="city"
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <Label htmlFor="province" className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>Province/State</span>
                  </Label>
                  <Input
                    id="province"
                    value={profileData.province}
                    onChange={(e) => setProfileData({ ...profileData, province: e.target.value })}
                    placeholder="NY"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode" className="flex items-center space-x-2">
                    <Target className="h-4 w-4" />
                    <span>Postal Code</span>
                  </Label>
                  <Input
                    id="postalCode"
                    value={profileData.postalCode}
                    onChange={(e) => setProfileData({ ...profileData, postalCode: e.target.value })}
                    placeholder="10001"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Social Links</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="linkedin" className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    <span>LinkedIn URL</span>
                  </Label>
                  <Input
                    id="linkedin"
                    type="url"
                    value={profileData.linkedin}
                    onChange={e => setProfileData({ ...profileData, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
                <div>
                  <Label htmlFor="github" className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span>GitHub URL</span>
                  </Label>
                  <Input
                    id="github"
                    type="url"
                    value={profileData.github}
                    onChange={e => setProfileData({ ...profileData, github: e.target.value })}
                    placeholder="https://github.com/yourusername"
                  />
                </div>
              </CardContent>
            </Card>
            {/* Education */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <GraduationCap className="h-5 w-5" />
                  <span>Education</span>
                </CardTitle>
                <Button type="button" variant="outline" onClick={addEducation} className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Education</span>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {educationList.map((education, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center space-x-2 mb-3">
                      <School className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-gray-900">Education Entry #{index + 1}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`degree-${index}`} className="flex items-center space-x-2">
                          <Award className="h-4 w-4" />
                          <span>Degree Program</span>
                        </Label>
                        <Input
                          id={`degree-${index}`}
                          value={education.degree}
                          onChange={(e) => {
                            const newEducation = [...educationList];
                            newEducation[index].degree = e.target.value;
                            setEducationList(newEducation);
                          }}
                          placeholder="Bachelor of Computer Science"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`institution-${index}`} className="flex items-center space-x-2">
                          <Building className="h-4 w-4" />
                          <span>Institution</span>
                        </Label>
                        <Input
                          id={`institution-${index}`}
                          value={education.institution}
                          onChange={(e) => {
                            const newEducation = [...educationList];
                            newEducation[index].institution = e.target.value;
                            setEducationList(newEducation);
                          }}
                          placeholder="University of Technology"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`fromDate-${index}`} className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>From Date</span>
                        </Label>
                        <Input
                          id={`fromDate-${index}`}
                          type="date"
                          value={education.fromDate}
                          onChange={(e) => {
                            const newEducation = [...educationList];
                            newEducation[index].fromDate = e.target.value;
                            setEducationList(newEducation);
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`toDate-${index}`} className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>To Date</span>
                        </Label>
                        <Input
                          id={`toDate-${index}`}
                          type="date"
                          value={education.toDate}
                          onChange={(e) => {
                            const newEducation = [...educationList];
                            newEducation[index].toDate = e.target.value;
                            setEducationList(newEducation);
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`totalMarks-${index}`} className="flex items-center space-x-2">
                          <Star className="h-4 w-4" />
                          <span>Total Marks/CGPA</span>
                        </Label>
                        <Input
                          id={`totalMarks-${index}`}
                          value={education.totalMarks}
                          onChange={(e) => {
                            const newEducation = [...educationList];
                            newEducation[index].totalMarks = e.target.value;
                            setEducationList(newEducation);
                          }}
                          placeholder="4.0"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`obtainedMarks-${index}`} className="flex items-center space-x-2">
                          <Award className="h-4 w-4" />
                          <span>Obtained Marks/CGPA</span>
                        </Label>
                        <Input
                          id={`obtainedMarks-${index}`}
                          value={education.obtainedMarks}
                          onChange={(e) => {
                            const newEducation = [...educationList];
                            newEducation[index].obtainedMarks = e.target.value;
                            setEducationList(newEducation);
                          }}
                          placeholder="3.8"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEducation(index)}
                        className="text-red-600 hover:text-red-700 flex items-center space-x-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Remove</span>
                      </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEducationSubmit(education, index)}
                        disabled={education.id ? updateEducationMutation.isPending : createEducationMutation.isPending}
                          className="flex items-center space-x-1"
                        >
                        {(education.id ? updateEducationMutation.isPending : createEducationMutation.isPending) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              <span>Save</span>
                            </>
                          )}
                        </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Experience */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Work Experience</span>
                </CardTitle>
                <Button type="button" variant="outline" onClick={addExperience} className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Experience</span>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {experienceList.map((experience, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex items-center space-x-2 mb-3">
                      <Workflow className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-gray-900">Experience Entry #{index + 1}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`company-${index}`} className="flex items-center space-x-2">
                          <Building className="h-4 w-4" />
                          <span>Company</span>
                        </Label>
                        <Input
                          id={`company-${index}`}
                          value={experience.company}
                          onChange={(e) => {
                            const newExperience = [...experienceList];
                            newExperience[index].company = e.target.value;
                            setExperienceList(newExperience);
                          }}
                          placeholder="Tech Solutions Inc."
                        />
                      </div>
                      <div>
                        <Label htmlFor={`role-${index}`} className="flex items-center space-x-2">
                          <Briefcase className="h-4 w-4" />
                          <span>Role</span>
                        </Label>
                        <Input
                          id={`role-${index}`}
                          value={experience.role}
                          onChange={(e) => {
                            const newExperience = [...experienceList];
                            newExperience[index].role = e.target.value;
                            setExperienceList(newExperience);
                          }}
                          placeholder="Frontend Developer"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`expFromDate-${index}`} className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>From Date</span>
                        </Label>
                        <Input
                          id={`expFromDate-${index}`}
                          type="date"
                          value={experience.fromDate}
                          onChange={(e) => {
                            const newExperience = [...experienceList];
                            newExperience[index].fromDate = e.target.value;
                            setExperienceList(newExperience);
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`expToDate-${index}`} className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>To Date</span>
                        </Label>
                        <Input
                          id={`expToDate-${index}`}
                          type="date"
                          value={experience.toDate}
                          onChange={(e) => {
                            const newExperience = [...experienceList];
                            newExperience[index].toDate = e.target.value;
                            setExperienceList(newExperience);
                          }}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`experienceDescription-${index}`} className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>Description (Bullet Points)</span>
                        </Label>
                        <div className="space-y-2">
                          {(Array.isArray(experience.description) ? experience.description : [""]).map((bullet: string, bulletIndex: number) => (
                            <div key={bulletIndex} className="flex items-center space-x-2">
                              <span className="text-gray-500 text-sm">•</span>
                              <Input
                                value={bullet}
                                onChange={(e) => {
                                  const newExperience = [...experienceList];
                                  if (!Array.isArray(newExperience[index].description)) {
                                    newExperience[index].description = [""];
                                  }
                                  newExperience[index].description[bulletIndex] = e.target.value;
                                  setExperienceList(newExperience);
                                }}
                                placeholder="Enter bullet point..."
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newExperience = [...experienceList];
                                  if (!Array.isArray(newExperience[index].description)) {
                                    newExperience[index].description = [""];
                                  }
                                  newExperience[index].description.splice(bulletIndex, 1);
                                  if (newExperience[index].description.length === 0) {
                                    newExperience[index].description = [""];
                                  }
                                  setExperienceList(newExperience);
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newExperience = [...experienceList];
                              if (!Array.isArray(newExperience[index].description)) {
                                newExperience[index].description = [""];
                              }
                              newExperience[index].description.push("");
                              setExperienceList(newExperience);
                            }}
                            className="flex items-center space-x-1"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add Bullet Point</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExperience(index)}
                        className="text-red-600 hover:text-red-700 flex items-center space-x-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Remove</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleExperienceSubmit(experience, index)}
                        disabled={experience.id ? updateExperienceMutation.isPending : createExperienceMutation.isPending}
                        className="flex items-center space-x-1"
                      >
                        {(experience.id ? updateExperienceMutation.isPending : createExperienceMutation.isPending) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>Save</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Projects */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Layers className="h-5 w-5" />
                  <span>Projects</span>
                </CardTitle>
                <Button type="button" variant="outline" onClick={addProject} className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Project</span>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {projectsList.map((project, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center space-x-2 mb-3">
                      <Layers className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-gray-900">Project #{index + 1}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor={`projectTitle-${index}`} className="flex items-center space-x-2">
                          <Layers className="h-4 w-4" />
                          <span>Project Title</span>
                        </Label>
                        <Input
                          id={`projectTitle-${index}`}
                          value={project.title}
                          onChange={(e) => {
                            const newProjects = [...projectsList];
                            newProjects[index].title = e.target.value;
                            setProjectsList(newProjects);
                          }}
                          placeholder="E-commerce Website"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`projectDescription-${index}`} className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>Description (Bullet Points)</span>
                        </Label>
                        <div className="space-y-2">
                          {project.description.map((bullet: string, bulletIndex: number) => (
                            <div key={bulletIndex} className="flex items-center space-x-2">
                              <span className="text-gray-500 text-sm">•</span>
                              <Input
                                value={bullet}
                                onChange={(e) => {
                                  const newProjects = [...projectsList];
                                  newProjects[index].description[bulletIndex] = e.target.value;
                                  setProjectsList(newProjects);
                                }}
                                placeholder="Enter bullet point..."
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newProjects = [...projectsList];
                                  newProjects[index].description.splice(bulletIndex, 1);
                                  if (newProjects[index].description.length === 0) {
                                    newProjects[index].description = [""];
                                  }
                                  setProjectsList(newProjects);
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newProjects = [...projectsList];
                              newProjects[index].description.push("");
                              setProjectsList(newProjects);
                            }}
                            className="flex items-center space-x-1"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add Bullet Point</span>
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`techStack-${index}`} className="flex items-center space-x-2">
                          <Code className="h-4 w-4" />
                          <span>Tech Stack</span>
                        </Label>
                        <Input
                          id={`techStack-${index}`}
                          value={project.techStack}
                          onChange={(e) => {
                            const newProjects = [...projectsList];
                            newProjects[index].techStack = e.target.value;
                            setProjectsList(newProjects);
                          }}
                          placeholder="React, Node.js, MongoDB"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`githubUrl-${index}`} className="flex items-center space-x-2">
                          <Github className="h-4 w-4" />
                          <span>GitHub URL</span>
                        </Label>
                        <Input
                          id={`githubUrl-${index}`}
                          value={project.githubUrl}
                          onChange={(e) => {
                            const newProjects = [...projectsList];
                            newProjects[index].githubUrl = e.target.value;
                            setProjectsList(newProjects);
                          }}
                          placeholder="https://github.com/username/project"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProject(index)}
                        className="text-red-600 hover:text-red-700 flex items-center space-x-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Remove</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleProjectSubmit(project, index)}
                        disabled={project.id ? updateProjectMutation.isPending : createProjectMutation.isPending}
                        className="flex items-center space-x-1"
                      >
                        {(project.id ? updateProjectMutation.isPending : createProjectMutation.isPending) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>Save</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Resume & Cover Letter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Documents</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="resume" className="flex items-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Resume Upload</span>
                  </Label>
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500">PDF, DOC, DOCX (max 5MB)</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileUpload}
                    />
                    {profileQueryData?.resumeUrl && (
                      <div className="mt-2 space-y-2">
                        <a 
                          href={profileQueryData.resumeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm block flex items-center justify-center space-x-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>View Current Resume</span>
                        </a>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => extractResumeTextMutation.mutate()}
                          disabled={extractResumeTextMutation.isPending}
                          className="flex items-center space-x-1"
                        >
                          {extractResumeTextMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                              <span>Extracting...</span>
                            </>
                          ) : (
                            <>
                              <Activity className="h-3 w-3" />
                              <span>Extract Resume Text</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="motivationLetter" className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Cover Letter</span>
                  </Label>
                  <Textarea
                    id="motivationLetter"
                    rows={6}
                    value={profileData.motivationLetter}
                    onChange={(e) => setProfileData({ ...profileData, motivationLetter: e.target.value })}
                    placeholder="Write a brief cover letter..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Skills</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {skills.map((skill, idx) => (
                    <div key={skill.id} className="flex items-center space-x-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                      <div className="flex items-center space-x-2 flex-1">
                        <Code className="h-4 w-4 text-purple-600" />
                      <input
                          className="border rounded px-3 py-2 flex-1 bg-white"
                        value={skill.name}
                        onChange={e => handleUpdateSkill(skill.id, { name: e.target.value, expertiseLevel: skill.expertiseLevel })}
                          placeholder="Skill name"
                      />
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[skill.expertiseLevel]}
                        onValueChange={([val]) => handleUpdateSkill(skill.id, { name: skill.name, expertiseLevel: val })}
                            className="w-24"
                          />
                        </div>
                        <span className="w-20 text-center text-sm font-medium text-gray-700">
                          {["Beginner", "", "Intermediate", "", "Expert"][skill.expertiseLevel-1]}
                        </span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteSkill(skill.id)} 
                          className="text-red-600 hover:text-red-700 flex items-center space-x-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center space-x-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
                    <div className="flex items-center space-x-2 flex-1">
                      <Plus className="h-4 w-4 text-blue-600" />
                    <input
                        className="border rounded px-3 py-2 flex-1 bg-white"
                      value={newSkill.name}
                      onChange={e => setNewSkill({ ...newSkill, name: e.target.value })}
                        placeholder="Add new skill"
                    />
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={[newSkill.expertiseLevel]}
                      onValueChange={([val]) => setNewSkill({ ...newSkill, expertiseLevel: val })}
                          className="w-24"
                        />
                      </div>
                      <span className="w-20 text-center text-sm font-medium text-gray-700">
                        {["Beginner", "", "Intermediate", "", "Expert"][newSkill.expertiseLevel-1]}
                      </span>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={handleAddSkill}
                        className="flex items-center space-x-1"
                        disabled={!newSkill.name.trim()}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Skill</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              {isProfileComplete({ ...profileData, email: user?.email, education: educationList, experience: experienceList, projects: projectsList }) && (
                <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setError(""); }} className="flex items-center space-x-2">
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending || !isProfileComplete({ ...profileData, email: user?.email, education: educationList, experience: experienceList, projects: projectsList })}
                className="px-8 flex items-center space-x-2"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Profile</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </main>
        
        {/* Welcome Popup for New Candidates */}
        <Dialog open={showWelcomePopup} onOpenChange={setShowWelcomePopup}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-xl">
                <User className="h-6 w-6 text-blue-600" />
                <span>Welcome! Complete Your Profile</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Required Fields to Complete:</h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium">Personal Information:</h4>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>First Name</li>
                        <li>Last Name</li>
                        <li>Date of Birth</li>
                        <li>CNIC (14 digits)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium">Address:</h4>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Apartment/Unit</li>
                        <li>Street</li>
                        <li>Area</li>
                        <li>City</li>
                        <li>Province</li>
                        <li>Postal Code</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h4 className="font-medium">Documents & Information:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Resume Upload</li>
                      <li>Motivation Letter</li>
                      <li>At least one Education entry</li>
                    </ul>
                  </div>
                  <div className="mt-3 p-2 bg-blue-100 rounded">
                    <p className="text-xs">
                      <strong>Note:</strong> Experience and Projects are optional for new graduates.
                      You can add them later to enhance your profile.
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <Button 
                  onClick={() => setShowWelcomePopup(false)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Got it! Let me complete my profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <ChatbotWidget />
      </div>
    </div>
  );
}
