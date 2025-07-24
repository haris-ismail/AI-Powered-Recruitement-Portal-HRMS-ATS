import React, { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import logo from "@/assets/NASTPLogo.png";
import { BarChart3, Briefcase, Users, Calendar, LogOut, Bell, FileText } from "lucide-react";
import { getCurrentUser, removeToken } from "@/lib/auth";

const initialFilters = {
  firstName: "",
  lastName: "",
  city: "",
  province: "",
  cnic: "",
  motivationLetter: "",
  skills: "",
  experience: "",
  education: "",
};

export default function ResumeSearchPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);

  const user = getCurrentUser();
  const handleLogout = () => {
    removeToken();
    window.location.href = "/login";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSearched(true);
    setResults([]);
    // If all fields are empty, clear results and return
    const isAllEmpty =
      !query &&
      Object.values(filters).every((v) => !v);
    if (isAllEmpty) {
      setResults([]);
      setLoading(false);
      return;
    }
    try {
      // Prepare filters for backend
      const payloadFilters: any = {
        firstName: filters.firstName || undefined,
        lastName: filters.lastName || undefined,
        city: filters.city || undefined,
        province: filters.province || undefined,
        cnic: filters.cnic || undefined,
        motivationLetter: filters.motivationLetter || undefined,
        skills: filters.skills ? filters.skills.split(",").map(s => s.trim()).filter(Boolean) : undefined,
        experience: filters.experience ? filters.experience.split(",").map(s => s.trim()).filter(Boolean) : undefined,
        education: filters.education ? filters.education.split(",").map(s => s.trim()).filter(Boolean) : undefined,
      };
      const token = localStorage.getItem('token');
      const res = await fetch('/api/candidate-search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keyword: query,
          filters: payloadFilters,
          page: 1,
          limit: 20
        })
      });
      if (!res.ok) throw new Error("Failed to fetch results");
      const data = await res.json();
      setResults(data.candidates || []);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
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
          {/* Search form */}
          <form className="mb-8 bg-white p-6 rounded shadow flex flex-col gap-4" onSubmit={handleSearch}>
            <div>
              <label className="block text-sm font-medium mb-1">Keyword (Resume Text)</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="e.g. javascript AND react"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. Awais"
                  value={filters.firstName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. Tariq"
                  value={filters.lastName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. Islamabad"
                  value={filters.city}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Province</label>
                <input
                  type="text"
                  name="province"
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. Punjab"
                  value={filters.province}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">CNIC</label>
                <input
                  type="text"
                  name="cnic"
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. 12345678901234"
                  value={filters.cnic}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Motivation Letter</label>
                <input
                  type="text"
                  name="motivationLetter"
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. passionate, eager"
                  value={filters.motivationLetter}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Skills (comma separated)</label>
                <input
                  type="text"
                  name="skills"
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. React, Node.js"
                  value={filters.skills}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Experience (comma separated)</label>
                <input
                  type="text"
                  name="experience"
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. Google, Engineer"
                  value={filters.experience}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Education (comma separated)</label>
                <input
                  type="text"
                  name="education"
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. MS, FAST"
                  value={filters.education}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button type="submit" className="bg-primary text-white px-6 py-2 rounded font-semibold hover:bg-primary/90" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>
          {/* Search results */}
          <div className="bg-white p-6 rounded shadow min-h-[200px]">
            {loading && <div className="text-gray-500 text-center">Searching...</div>}
            {error && <div className="text-red-600 text-center">{error}</div>}
            {!loading && !error && searched && results.length === 0 && (
              <div className="text-gray-500 text-center">No results found.</div>
            )}
            {!loading && !error && results.length > 0 && (
              <ul className="divide-y">
                {results.map((c: any) => (
                  <li key={c.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="font-semibold text-lg">{c.firstName || "(No Name)"} {c.lastName || ""}</div>
                      <div className="text-sm text-gray-500">{c.city || "-"}, {c.province || "-"}</div>
                      <div className="text-xs text-gray-400 mt-1 line-clamp-2 max-w-2xl">{c.resumeText?.slice(0, 200) || "No resume text available."}</div>
                    </div>
                    <div className="flex-shrink-0 mt-2 md:mt-0">
                      <button
                        className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm font-semibold"
                        onClick={() => handleView(c)}
                      >
                        View
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Modal for candidate preview */}
          {showModal && selectedCandidate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                  onClick={closeModal}
                  aria-label="Close"
                >
                  &times;
                </button>
                <div className="mb-4">
                  <div className="text-2xl font-bold mb-1">{selectedCandidate.firstName || "(No Name)"} {selectedCandidate.lastName || ""}</div>
                  <div className="text-gray-600 mb-2">{selectedCandidate.city || "-"}, {selectedCandidate.province || "-"}</div>
                  <div className="text-sm text-gray-500 mb-2">CNIC: {selectedCandidate.cnic || "-"}</div>
                </div>
                <div className="mb-2">
                  <div className="font-semibold mb-1">Resume Text</div>
                  <div className="text-sm whitespace-pre-wrap max-h-64 overflow-y-auto border rounded p-2 bg-gray-50">
                    {selectedCandidate.resumeText || "No resume text available."}
                  </div>
                </div>
                {/* Add more candidate details here if needed */}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
} 