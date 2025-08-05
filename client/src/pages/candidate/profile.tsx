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
  X
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import logo from "@/assets/NASTPLogo.png";
import { ChatbotWidget } from "@/components/ChatbotWidget";

function isProfileComplete(profile: any) {
  // Define required fields for completeness
  return (
    profile?.firstName &&
    profile?.lastName &&
    profile?.dateOfBirth &&
    profile?.apartment &&
    profile?.street &&
    profile?.area &&
    profile?.city &&
    profile?.province &&
    profile?.postalCode
  );
}

function ProfileCard({ profile, educationList, experienceList, skills, onEdit }: any) {
  console.log("ProfileCard received profile:", profile); // Debug log
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
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">Address:</span>
            </div>
            <div className="ml-6">
              <div>{profile.apartment}, {profile.street}, {profile.area}</div>
              <div>{profile.city}, {profile.province}, {profile.postalCode}</div>
            </div>
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
                            <span>{edu.obtainedMarks}/{edu.totalMarks}</span>
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
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="italic text-gray-400">No experience info</span>
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
              <div className="space-y-2">
                {skills.map((skill: any, i: number) => (
                  <div key={i} className="flex items-center space-x-3 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                    <div className="flex items-center space-x-2 flex-1">
                      <Code className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-gray-900 min-w-[120px]">{skill.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Slider min={1} max={5} step={1} value={[skill.expertiseLevel]} disabled className="w-24" />
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-400" />
                        <span className="text-xs font-medium text-gray-700 min-w-[80px] text-center">
                          {["Beginner", "", "Intermediate", "", "Expert"][skill.expertiseLevel-1]}
                        </span>
                      </div>
                    </div>
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
    resumeText: ""
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
      skills: ""
    }
  ]);

  // Add state for skills
  const [skills, setSkills] = useState<any[]>([]);
  
  const [isEditing, setIsEditing] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState("");
  const [resumeText, setResumeText] = useState("");

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

  useEffect(() => {
    if (profileQueryData) {
      // Always update education and experience lists
      setEducationList(profileQueryData.education || []);
      setExperienceList(profileQueryData.experience || []);
      setResumeText(profileQueryData.resumeText || "");
      
      // Only update profile data if we're not currently editing
      // This prevents form data from being reset when education/experience is added
      if (!isEditing) {
        setProfileData({
          cnic: profileQueryData.cnic || "",
          firstName: profileQueryData.firstName || "",
          lastName: profileQueryData.lastName || "",
          dateOfBirth: profileQueryData.dateOfBirth || "",
          apartment: profileQueryData.apartment || "",
          street: profileQueryData.street || "",
          area: profileQueryData.area || "",
          city: profileQueryData.city || "",
          province: profileQueryData.province || "",
          postalCode: profileQueryData.postalCode || "",
          motivationLetter: profileQueryData.motivationLetter || "",
          resumeUrl: profileQueryData.resumeUrl || "",
          profilePicture: profileQueryData.profilePicture || "",
          resumeText: profileQueryData.resumeText || ""
        });
      }
      
      // Initialize isEditing based on profile completeness only once
      if (isEditing === undefined) {
        if (isProfileComplete(profileQueryData)) {
          setIsEditing(false);
        } else {
          setIsEditing(true);
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
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
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
    if (!isProfileComplete({ ...profileData, email: user.email })) {
      setError("Please fill all required fields to save your profile.");
      return;
    }
    setError("");
    try {
      await updateProfileMutation.mutateAsync({ ...profileData, email: user.email });
      // setIsEditing(false) is now handled in the mutation's onSuccess callback
    } catch (err: any) {
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
        return;
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
        description: error.message || "Failed to add education",
        variant: "destructive",
      });
    }
  };

  const handleExperienceSubmit = async (experience: any, index: number) => {
    try {
      if (experience.id) {
        // Update existing experience
        return;
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
        description: error.message || "Failed to add experience",
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
      skills: ""
    }]);
  };

  const removeExperience = async (index: number) => {
    const experience = experienceList[index];
    if (experience.id) {
      await deleteExperienceMutation.mutateAsync(experience.id);
    }
    setExperienceList(experienceList.filter((_, i) => i !== index));
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
                  {profileQueryData.firstName && profileQueryData.lastName 
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
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h2>
              <p className="text-gray-600">View and edit your profile information</p>
            </div>
            <ProfileCard 
              profile={{ ...profileQueryData, email: user?.email }} 
              educationList={educationList} 
              experienceList={experienceList} 
              skills={skills}
              onEdit={() => setIsEditing(true)} 
            />
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
                {profileQueryData.firstName && profileQueryData.lastName 
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
                  {profileQueryData.profilePicture ? (
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
                    value={profileQueryData.cnic}
                    onChange={(e) => setProfileData({ ...profileQueryData, cnic: e.target.value.replace(/[^\d]/g, "") })}
                    placeholder="12345678901234"
                    maxLength={14}
                    minLength={14}
                  />
                </div>
                <div>
                  <Label htmlFor="firstName" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>First Name</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={profileQueryData.firstName}
                    onChange={(e) => setProfileData({ ...profileQueryData, firstName: e.target.value })}
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
                    value={profileQueryData.lastName}
                    onChange={(e) => setProfileData({ ...profileQueryData, lastName: e.target.value })}
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
                    value={profileQueryData.dateOfBirth}
                    onChange={(e) => setProfileData({ ...profileQueryData, dateOfBirth: e.target.value })}
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
                    value={profileQueryData.apartment}
                    onChange={(e) => setProfileData({ ...profileQueryData, apartment: e.target.value })}
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
                    value={profileQueryData.street}
                    onChange={(e) => setProfileData({ ...profileQueryData, street: e.target.value })}
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
                    value={profileQueryData.area}
                    onChange={(e) => setProfileData({ ...profileQueryData, area: e.target.value })}
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
                    value={profileQueryData.city}
                    onChange={(e) => setProfileData({ ...profileQueryData, city: e.target.value })}
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
                    value={profileQueryData.province}
                    onChange={(e) => setProfileData({ ...profileQueryData, province: e.target.value })}
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
                    value={profileQueryData.postalCode}
                    onChange={(e) => setProfileData({ ...profileQueryData, postalCode: e.target.value })}
                    placeholder="10001"
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
                      {!education.id ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEducationSubmit(education, index)}
                          disabled={createEducationMutation.isPending}
                          className="flex items-center space-x-1"
                        >
                          {createEducationMutation.isPending ? (
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
                      ) : (
                        <div className="flex items-center text-green-600 text-sm">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Saved
                        </div>
                      )}
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
                        <Label htmlFor={`skills-${index}`} className="flex items-center space-x-2">
                          <Code className="h-4 w-4" />
                          <span>Skills Used</span>
                        </Label>
                        <Input
                          id={`skills-${index}`}
                          value={experience.skills}
                          onChange={(e) => {
                            const newExperience = [...experienceList];
                            newExperience[index].skills = e.target.value;
                            setExperienceList(newExperience);
                          }}
                          placeholder="React, JavaScript, HTML, CSS"
                        />
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
                      {!experience.id ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleExperienceSubmit(experience, index)}
                          disabled={createExperienceMutation.isPending}
                          className="flex items-center space-x-1"
                        >
                          {createExperienceMutation.isPending ? (
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
                      ) : (
                        <div className="flex items-center text-green-600 text-sm">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Saved
                        </div>
                      )}
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
                    value={profileQueryData.motivationLetter}
                    onChange={(e) => setProfileData({ ...profileQueryData, motivationLetter: e.target.value })}
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
              {isProfileComplete({ ...profileQueryData, email: user?.email }) && (
                <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setError(""); }} className="flex items-center space-x-2">
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending || !isProfileComplete({ ...profileQueryData, email: user?.email })}
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
        <ChatbotWidget />
      </div>
    </div>
  );
}
