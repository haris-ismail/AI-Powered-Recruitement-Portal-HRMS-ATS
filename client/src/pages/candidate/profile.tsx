import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentUser, removeToken } from "@/lib/auth";
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
  Save
} from "lucide-react";
import logo from "@/assets/NASTPLogo.png";

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

function ProfileCard({ profile, educationList, experienceList, onEdit }: any) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Profile</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div>
            <div className="font-semibold">Name:</div>
            <div>{profile.firstName} {profile.lastName}</div>
            <div className="font-semibold mt-2">Date of Birth:</div>
            <div>{profile.dateOfBirth}</div>
            <div className="font-semibold mt-2">Email:</div>
            <div>{profile.email}</div>
          </div>
          <div>
            <div className="font-semibold">Address:</div>
            <div>{profile.apartment}, {profile.street}, {profile.area}</div>
            <div>{profile.city}, {profile.province}, {profile.postalCode}</div>
          </div>
        </div>
        <div className="mb-4">
          <div className="font-semibold">Motivation Letter:</div>
          <div className="whitespace-pre-line text-gray-700 text-sm">{profile.motivationLetter || <span className="italic text-gray-400">Not provided</span>}</div>
        </div>
        <div className="mb-4">
          <div className="font-semibold mb-1">Education:</div>
          {educationList && educationList.length > 0 ? educationList.map((edu: any, i: number) => (
            <div key={i} className="text-sm mb-1">{edu.degree} at {edu.institution} ({edu.fromDate} - {edu.toDate})</div>
          )) : <span className="italic text-gray-400">No education info</span>}
        </div>
        <div className="mb-4">
          <div className="font-semibold mb-1">Experience:</div>
          {experienceList && experienceList.length > 0 ? experienceList.map((exp: any, i: number) => (
            <div key={i} className="text-sm mb-1">{exp.role} at {exp.company} ({exp.fromDate} - {exp.toDate})</div>
          )) : <span className="italic text-gray-400">No experience info</span>}
        </div>
        <div className="mb-4">
          <div className="font-semibold">Resume:</div>
          {profile.resumeUrl ? (
            <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">View Resume</a>
          ) : <span className="italic text-gray-400">Not uploaded</span>}
        </div>
        <Button type="button" onClick={onEdit} className="mt-2">Edit Profile</Button>
      </CardContent>
    </Card>
  );
}

export default function CandidateProfile() {
  const { toast } = useToast();
  const user = getCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    apartment: "",
    street: "",
    area: "",
    city: "",
    province: "",
    postalCode: "",
    motivationLetter: ""
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

  const [isEditing, setIsEditing] = useState(true);
  const [error, setError] = useState("");

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ["/api/profile"],
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        dateOfBirth: profile.dateOfBirth || "",
        apartment: profile.apartment || "",
        street: profile.street || "",
        area: profile.area || "",
        city: profile.city || "",
        province: profile.province || "",
        postalCode: profile.postalCode || "",
        motivationLetter: profile.motivationLetter || ""
      });
      setEducationList(profile.education || []);
      setExperienceList(profile.experience || []);
      // Set isEditing based on profile completeness
      if (isProfileComplete(profile)) {
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
    }
  }, [profile]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  const deleteEducationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/education/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  const createExperienceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/experience", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  const deleteExperienceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/experience/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  const uploadResumeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/upload-resume", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Resume uploaded successfully",
      });
      // Instead of refetching, update the local state for resumeUrl
      setProfileData(prev => ({ ...prev, resumeUrl: data.resumeUrl }));
      // queryClient.invalidateQueries({ queryKey: ["/api/profile"] }); // Removed
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload resume",
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProfileComplete({ ...profileData, email: user?.email })) {
      setError("Please fill all required fields to save your profile.");
      return;
    }
    setError("");
    await updateProfileMutation.mutateAsync(profileData);
    setIsEditing(false);
  };

  const handleEducationSubmit = async (education: any, index: number) => {
    if (education.id) {
      // Update existing education
      return;
    } else {
      // Create new education
      await createEducationMutation.mutateAsync(education);
    }
  };

  const handleExperienceSubmit = async (experience: any, index: number) => {
    if (experience.id) {
      // Update existing experience
      return;
    } else {
      // Create new experience
      await createExperienceMutation.mutateAsync(experience);
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

  const handleLogout = () => {
    removeToken();
    window.location.href = "/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show card if profile is complete and not editing
  if (!isEditing && isProfileComplete({ ...profileData, email: user?.email }) && profile) {
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
                  {profileData.firstName && profileData.lastName 
                    ? `${profileData.firstName} ${profileData.lastName}`
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
              <Link href="/candidate">
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
            </nav>
          </aside>
          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h2>
              <p className="text-gray-600">View and edit your profile information</p>
            </div>
            <ProfileCard 
              profile={{ ...profileData, email: user?.email, resumeUrl: profile?.resumeUrl }} 
              educationList={educationList} 
              experienceList={experienceList} 
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
                {profileData.firstName && profileData.lastName 
                  ? `${profileData.firstName} ${profileData.lastName}`
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
            <Link href="/candidate">
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
                  <span>Personal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
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
                  <Label htmlFor="apartment">Apartment/Unit</Label>
                  <Input
                    id="apartment"
                    value={profileData.apartment}
                    onChange={(e) => setProfileData({ ...profileData, apartment: e.target.value })}
                    placeholder="Apt 4B"
                  />
                </div>
                <div>
                  <Label htmlFor="street">Street</Label>
                  <Input
                    id="street"
                    value={profileData.street}
                    onChange={(e) => setProfileData({ ...profileData, street: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <Label htmlFor="area">Area</Label>
                  <Input
                    id="area"
                    value={profileData.area}
                    onChange={(e) => setProfileData({ ...profileData, area: e.target.value })}
                    placeholder="Downtown"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <Label htmlFor="province">Province/State</Label>
                  <Input
                    id="province"
                    value={profileData.province}
                    onChange={(e) => setProfileData({ ...profileData, province: e.target.value })}
                    placeholder="NY"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={profileData.postalCode}
                    onChange={(e) => setProfileData({ ...profileData, postalCode: e.target.value })}
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
                <Button type="button" variant="outline" onClick={addEducation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Education
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {educationList.map((education, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`degree-${index}`}>Degree Program</Label>
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
                        <Label htmlFor={`institution-${index}`}>Institution</Label>
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
                        <Label htmlFor={`fromDate-${index}`}>From Date</Label>
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
                        <Label htmlFor={`toDate-${index}`}>To Date</Label>
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
                        <Label htmlFor={`totalMarks-${index}`}>Total Marks/CGPA</Label>
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
                        <Label htmlFor={`obtainedMarks-${index}`}>Obtained Marks/CGPA</Label>
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
                    <div className="flex justify-between items-center mt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEducation(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEducationSubmit(education, index)}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
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
                <Button type="button" variant="outline" onClick={addExperience}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Experience
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {experienceList.map((experience, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`company-${index}`}>Company</Label>
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
                        <Label htmlFor={`role-${index}`}>Role</Label>
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
                        <Label htmlFor={`expFromDate-${index}`}>From Date</Label>
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
                        <Label htmlFor={`expToDate-${index}`}>To Date</Label>
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
                        <Label htmlFor={`skills-${index}`}>Skills</Label>
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
                    <div className="flex justify-between items-center mt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExperience(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleExperienceSubmit(experience, index)}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Resume & Motivation Letter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Documents</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="resume">Resume Upload</Label>
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
                    {profile?.resumeUrl && (
                      <div className="mt-2">
                        <a 
                          href={profile.resumeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          View Current Resume
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="motivationLetter">Motivation Letter</Label>
                  <Textarea
                    id="motivationLetter"
                    rows={6}
                    value={profileData.motivationLetter}
                    onChange={(e) => setProfileData({ ...profileData, motivationLetter: e.target.value })}
                    placeholder="Write a brief motivation letter..."
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              {isProfileComplete({ ...profileData, email: user?.email }) && (
                <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setError(""); }}>
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending || !isProfileComplete({ ...profileData, email: user?.email })}
                className="px-8"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
