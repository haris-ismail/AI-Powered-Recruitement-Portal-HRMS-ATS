import React, { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/NASTPLogo.png";
import { BarChart3, Briefcase, Users, Calendar, LogOut, Bell, FileText, MapPin, GraduationCap, Code, Star, Eye, Mail, User, Download, Layers } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const initialFilters = {
  firstName: '',
  lastName: '',
  city: '',
  province: '',
  cnic: '',
  motivationLetter: ''
};

export default function ResumeSearchPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);

  const { user, logout } = useAuth();
  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const handleSearch = async () => {
    if (!query.trim() && Object.values(filters).every(v => !v)) {
      console.log('Please enter a search query or use at least one filter');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearched(true);
    setResults([]);
    
    try {
      const payloadFilters = {
        firstName: filters.firstName || undefined,
        lastName: filters.lastName || undefined,
        city: filters.city || undefined,
        province: filters.province || undefined,
        cnic: filters.cnic || undefined,
        motivationLetter: filters.motivationLetter || undefined,
      };
      
      console.log('🔍 Sending filters to backend:', payloadFilters);
      
      const response = await fetch('/api/candidate-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          filters: payloadFilters,
          page: currentPage,
          limit: itemsPerPage
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      console.log('🔍 Frontend: Search response received:', data);
      
      setResults(data.candidates || []);
      setTotalResults(data.total || 0);
      setCurrentPage(data.page || 1);
      
      if (data.candidates && data.candidates.length > 0) {
        console.log(`Found ${data.candidates.length} candidates`);
      } else {
        console.log('No candidates found matching your criteria');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (candidate: any) => {
    setSelectedCandidate(candidate);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCandidate(null);
  };

  // Helper function to render skills with expertise levels
  const renderSkills = (skills: any[]) => {
    
    if (!skills || skills.length === 0) {
      return <span className="text-gray-400">No skills listed</span>;
    }
    
    return (
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <Badge key={skill.id || index} variant="secondary" className="flex items-center gap-1">
            <Code className="h-3 w-3" />
            {skill.name}
            <div className="flex items-center gap-1 ml-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`h-2 w-2 ${i < skill.expertiseLevel ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                />
              ))}
            </div>
          </Badge>
        ))}
      </div>
    );
  };

  // Helper function to render experience
  const renderExperience = (experience: any[]) => {
    
    if (!experience || experience.length === 0) {
      return <span className="text-gray-400">No experience listed</span>;
    }
    
    return (
      <div className="space-y-2">
        {experience.map((exp, index) => (
          <div key={exp.id || index} className="border-l-2 border-blue-200 pl-3">
            <div className="font-medium text-sm">{exp.role}</div>
            <div className="text-sm text-gray-600">{exp.company}</div>
            <div className="text-xs text-gray-500">{exp.fromDate} - {exp.toDate}</div>
            {exp.skills && (
              <div className="text-xs text-gray-600 mt-1">
                <span className="font-medium">Skills:</span> {exp.skills}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Helper function to render education
  const renderEducation = (education: any[]) => {
    
    if (!education || education.length === 0) {
      return <span className="text-gray-400">No education listed</span>;
    }
    
    return (
      <div className="space-y-2">
        {education.map((edu, index) => (
          <div key={edu.id || index} className="border-l-2 border-green-200 pl-3">
            <div className="font-medium text-sm">{edu.degree}</div>
            <div className="text-sm text-gray-600">{edu.institution}</div>
            <div className="text-xs text-gray-500">{edu.fromDate} - {edu.toDate}</div>
            <div className="text-xs text-gray-600">
              {edu.obtainedMarks}/{edu.totalMarks} marks
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Helper function to render projects
  const renderProjects = (projects: any[]) => {
    if (!projects || projects.length === 0) {
      return <span className="text-gray-400">No projects listed</span>;
    }

    return (
      <div className="space-y-3">
        {projects.map((project, index) => (
          <div key={project.id || index} className="border-l-2 border-indigo-200 pl-3">
            <div className="font-medium text-sm">{project.title}</div>
            <div className="text-sm text-gray-600">{project.description}</div>
            <div className="text-xs text-gray-500">
              {project.fromDate} - {project.toDate || "Present"}
            </div>
            {project.technologies && (
              <div className="text-xs text-gray-600 mt-1">
                <span className="font-medium">Technologies:</span> {project.technologies}
              </div>
            )}
            {project.githubUrl && (
              <div className="text-xs text-blue-600 hover:underline mt-1">
                <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                  View on GitHub
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

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
            <Link href="/admin">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
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
            <Link href="/admin/resume-search">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-primary text-white">
                <FileText className="h-5 w-5" />
                <span>Resume Search</span>
              </a>
            </Link>
            <Link href="/admin/email-templates">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
                <Calendar className="h-5 w-5" />
                <span>Email Templates</span>
              </a>
            </Link>
            <Link href="/admin/assessment-templates">
              <a className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100">
                <FileText className="h-5 w-5" />
                <span>Assessment Templates</span>
              </a>
            </Link>
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold mb-6">Candidate Database Search</h1>
          {/* Search Form */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Search Candidates</h2>
            
            {/* Keyword Search */}
            <div className="mb-6">
              <Label htmlFor="keyword">Keyword Search</Label>
              <Input
                id="keyword"
                type="text"
                placeholder="Search in name, CNIC, city, province, or motivation letter"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mt-1"
              />
            </div>
            
            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="First name"
                  value={filters.firstName}
                  onChange={(e) => setFilters(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  value={filters.lastName}
                  onChange={(e) => setFilters(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={filters.city}
                  onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="province">Province</Label>
                <Input
                  id="province"
                  placeholder="Province"
                  value={filters.province}
                  onChange={(e) => setFilters(prev => ({ ...prev, province: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="cnic">CNIC</Label>
                <Input
                  id="cnic"
                  placeholder="CNIC"
                  value={filters.cnic}
                  onChange={(e) => setFilters(prev => ({ ...prev, cnic: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="motivationLetter">Motivation Letter</Label>
                <Input
                  id="motivationLetter"
                  placeholder="Motivation letter keywords"
                  value={filters.motivationLetter}
                  onChange={(e) => setFilters(prev => ({ ...prev, motivationLetter: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <button 
                type="button" 
                className="bg-primary text-white px-6 py-2 rounded font-semibold hover:bg-primary/90" 
                disabled={isLoading}
                onClick={handleSearch}
              >
                {isLoading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
          {/* Search results */}
          <div className="bg-white p-6 rounded shadow min-h-[200px]">
            {isLoading && <div className="text-gray-500 text-center">Searching...</div>}
            {error && <div className="text-red-600 text-center">{error}</div>}
            {!isLoading && !error && searched && results.length === 0 && (
              <div className="text-gray-500 text-center">No results found.</div>
            )}
            {!isLoading && !error && results.length > 0 && (
              <div className="space-y-4">
                {results.map((candidate: any) => (
                  <Card key={candidate.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 space-y-4">
                          {/* Basic Info */}
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-lg">
                                {candidate.firstName?.[0] || candidate.lastName?.[0] || "?"}
                              </span>
                            </div>
                            <div>
                              <div className="font-semibold text-xl">
                                {candidate.firstName || "(No Name)"} {candidate.lastName || ""}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin className="h-4 w-4" />
                                {candidate.city || "-"}, {candidate.province || "-"}
                              </div>
                              {candidate.email && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mail className="h-4 w-4" />
                                  {candidate.email}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Skills Preview */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Code className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">Top Skills</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {candidate.skills && candidate.skills.length > 0 ? (
                                candidate.skills.slice(0, 5).map((skill: any, skillIndex: number) => (
                                  <Badge key={skill.id || skillIndex} variant="outline" className="text-xs">
                                    {skill.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-gray-400 text-sm">No skills listed</span>
                              )}
                            </div>
                          </div>

                          {/* Experience Preview */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Briefcase className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">Recent Experience</span>
                            </div>
                            {candidate.experience && candidate.experience.length > 0 ? (
                              <div className="text-sm text-gray-600">
                                {candidate.experience[0].role} at {candidate.experience[0].company}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No experience listed</span>
                            )}
                          </div>

                          {/* Education Preview */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <GraduationCap className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">Education</span>
                            </div>
                            {candidate.education && candidate.education.length > 0 ? (
                              <div className="text-sm text-gray-600">
                                {candidate.education[0].degree} from {candidate.education[0].institution}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No education listed</span>
                            )}
                          </div>

                          {/* Projects Preview */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Layers className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">Recent Projects</span>
                            </div>
                            {candidate.projects && candidate.projects.length > 0 ? (
                              <div className="text-sm text-gray-600">
                                {candidate.projects[0].title}
                                {candidate.projects[0].techStack && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    ({candidate.projects[0].techStack})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No projects listed</span>
                            )}
                          </div>
                        </div>

                        <div className="flex-shrink-0 flex flex-col gap-2">
                          <Button
                            onClick={() => handleView(candidate)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                            View Full Profile
                          </Button>
                          {candidate.resumeUrl && (
                            <Button
                              variant="outline"
                              className="flex items-center gap-2"
                              onClick={() => window.open(candidate.resumeUrl, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                              View Resume
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          {/* Modal for candidate profile */}
          {showModal && selectedCandidate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
                <button
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold z-10"
                  onClick={closeModal}
                  aria-label="Close"
                >
                  &times;
                </button>
                
                <div className="space-y-6">
                  {/* Header */}
                  <div className="border-b pb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-3xl">
                          {selectedCandidate.firstName?.[0] || selectedCandidate.lastName?.[0] || "?"}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold">
                          {selectedCandidate.firstName || "(No Name)"} {selectedCandidate.lastName || ""}
                        </h2>
                        <div className="flex items-center gap-2 text-lg text-gray-600 mt-1">
                          <MapPin className="h-5 w-5" />
                          {selectedCandidate.city || "-"}, {selectedCandidate.province || "-"}
                        </div>
                        {selectedCandidate.email && (
                          <div className="flex items-center gap-2 text-lg text-gray-600 mt-1">
                            <Mail className="h-5 w-5" />
                            {selectedCandidate.email}
                          </div>
                        )}
                        {selectedCandidate.cnic && (
                          <div className="text-sm text-gray-500 mt-1">
                            CNIC: {selectedCandidate.cnic}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <Code className="h-5 w-5 text-blue-600" />
                      Skills & Expertise
                    </h3>
                    {renderSkills(selectedCandidate.skills)}
                  </div>

                  {/* Experience Section */}
                  <div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-green-600" />
                      Work Experience
                    </h3>
                    {renderExperience(selectedCandidate.experience)}
                  </div>

                  {/* Education Section */}
                  <div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-purple-600" />
                      Education
                    </h3>
                    {renderEducation(selectedCandidate.education)}
                  </div>

                  {/* Projects Section */}
                  <div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <Layers className="h-5 w-5 text-indigo-600" />
                      Projects
                    </h3>
                    {renderProjects(selectedCandidate.projects)}
                  </div>

                  {/* Additional Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedCandidate.motivationLetter && (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Motivation Letter</h3>
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border">
                          {selectedCandidate.motivationLetter}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Contact & Links</h3>
                      <div className="space-y-2 text-sm">
                        {selectedCandidate.linkedin && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">LinkedIn:</span>
                            <a href={selectedCandidate.linkedin} target="_blank" rel="noopener noreferrer" 
                               className="text-blue-600 hover:underline">
                              View Profile
                            </a>
                          </div>
                        )}
                        {selectedCandidate.github && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">GitHub:</span>
                            <a href={selectedCandidate.github} target="_blank" rel="noopener noreferrer" 
                               className="text-blue-600 hover:underline">
                              View Profile
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resume Download */}
                  {selectedCandidate.resumeUrl && (
                    <div className="flex justify-center">
                      <Button
                        onClick={() => window.open(selectedCandidate.resumeUrl, '_blank')}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Download className="h-5 w-5" />
                        View Resume
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
} 