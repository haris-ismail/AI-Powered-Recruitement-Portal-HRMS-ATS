import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, BarChart3, Briefcase, Users, Calendar, LogOut, Bell } from "lucide-react";
import logo from "@/assets/NASTPLogo.png";
import { Link } from "wouter";
import { getCurrentUser } from "@/lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Template {
  id: number;
  title: string;
  description?: string;
  categoryId: number;
  durationMinutes: number;
  passingScore: number;
  isActive: boolean;
  createdBy: number;
  createdAt?: string;
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

// Question type definitions
type QuestionType = "mcq_single" | "mcq_multiple" | "true_false" | "short_answer";
interface Question {
  id: number;
  templateId: number;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswers?: string[];
  points: number;
  orderIndex: number;
}

// Question Manager Modal (scaffold)
function QuestionManagerModal({ templateId, open, onClose }: { templateId: number, open: boolean, onClose: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Question>>({ questionType: "mcq_single", points: 1, orderIndex: 1 });
  const [optionInput, setOptionInput] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch questions for this template
  useEffect(() => {
    if (open && templateId) {
      setLoading(true);
      const token = localStorage.getItem("token");
      fetch(`/api/assessment-templates/${templateId}/questions`, {
        headers: { "Authorization": `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => setQuestions(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
    }
  }, [open, templateId]);

  // Reset form when modal opens or template changes
  useEffect(() => {
    if (open) {
      setForm({ questionType: "mcq_single", points: 1, orderIndex: questions.length + 1 });
      setOptions([]);
      setCorrectAnswers([]);
      setOptionInput("");
      setError(null);
    }
  }, [open, templateId, questions.length]);

  // Add option for MCQ
  const handleAddOption = () => {
    if (optionInput.trim() && !options.includes(optionInput.trim())) {
      setOptions([...options, optionInput.trim()]);
      setOptionInput("");
    }
  };

  // Add new question
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = localStorage.getItem("token");
    if (!form.questionText || !form.questionType || !form.points) {
      setError("Please fill all required fields.");
      return;
    }
    let payload: any = {
      questionText: form.questionText,
      questionType: form.questionType,
      points: Number(form.points),
      orderIndex: questions.length + 1,
    };
    if (form.questionType === "mcq_single" || form.questionType === "mcq_multiple") {
      if (options.length < 2) {
        setError("Please add at least two options.");
        return;
      }
      if (correctAnswers.length === 0) {
        setError("Please select at least one correct answer.");
        return;
      }
      payload.options = options;
      payload.correctAnswers = correctAnswers;
    }
    if (form.questionType === "true_false") {
      payload.options = ["True", "False"];
      if (correctAnswers.length !== 1) {
        setError("Please select the correct answer.");
        return;
      }
      payload.correctAnswers = correctAnswers;
    }
    // No extra fields for short_answer
    setLoading(true);
    const res = await fetch(`/api/assessment-templates/${templateId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const newQ = await res.json();
      setQuestions([...questions, newQ]);
      setForm({ questionType: form.questionType, points: 1, orderIndex: questions.length + 2 });
      setOptions([]);
      setCorrectAnswers([]);
      setOptionInput("");
      setError(null);
    } else {
      setError("Failed to add question.");
    }
    setLoading(false);
  };

  // Delete question
  const handleDelete = async (id: number) => {
    const token = localStorage.getItem("token");
    setLoading(true);
    await fetch(`/api/assessment-questions/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    setQuestions(questions.filter(q => q.id !== id));
    setLoading(false);
  };

  // Render options for MCQ/TrueFalse
  const renderOptions = () => {
    if (form.questionType === "mcq_single" || form.questionType === "mcq_multiple") {
      return (
        <div className="mb-2">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={optionInput}
              onChange={e => setOptionInput(e.target.value)}
              placeholder="Add option"
              className="border rounded px-2 py-1"
            />
            <Button type="button" onClick={handleAddOption}>Add Option</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {options.map(opt => (
              <label key={opt} className="flex items-center gap-1 border rounded px-2 py-1">
                <input
                  type={form.questionType === "mcq_single" ? "radio" : "checkbox"}
                  name="correctAnswers"
                  value={opt}
                  checked={correctAnswers.includes(opt)}
                  onChange={e => {
                    if (form.questionType === "mcq_single") {
                      setCorrectAnswers([opt]);
                    } else {
                      setCorrectAnswers(prev =>
                        e.target.checked ? [...prev, opt] : prev.filter(a => a !== opt)
                      );
                    }
                  }}
                />
                {opt}
                <Button type="button" size="sm" variant="ghost" onClick={() => setOptions(options.filter(o => o !== opt))}>×</Button>
              </label>
            ))}
          </div>
        </div>
      );
    }
    if (form.questionType === "true_false") {
      return (
        <div className="mb-2 flex gap-4">
          {["True", "False"].map(opt => (
            <label key={opt} className="flex items-center gap-1 border rounded px-2 py-1">
              <input
                type="radio"
                name="correctAnswers"
                value={opt}
                checked={correctAnswers.includes(opt)}
                onChange={() => setCorrectAnswers([opt])}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Questions</DialogTitle>
          <DialogDescription>Add, edit, or delete questions for this template.</DialogDescription>
        </DialogHeader>
        {loading ? <p>Loading...</p> : (
          <div>
            {/* List of questions */}
            <ul className="mb-4">
              {questions.map(q => (
                <li key={q.id} className="border-b py-2 flex justify-between items-center">
                  <div>
                    <strong>{q.questionText}</strong> <span className="text-xs text-gray-500">({q.questionType})</span>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(q.id)}>Delete</Button>
                </li>
              ))}
            </ul>
            {/* Add/Edit question form */}
            <form onSubmit={handleAddQuestion} className="border-t pt-4 space-y-2">
              <div className="flex gap-2">
                <select
                  value={form.questionType}
                  onChange={e => setForm(f => ({ ...f, questionType: e.target.value as QuestionType }))}
                  className="border rounded px-2 py-1"
                >
                  <option value="mcq_single">MCQ (Single Correct)</option>
                  <option value="mcq_multiple">MCQ (Multiple Correct)</option>
                  <option value="true_false">True/False</option>
                  <option value="short_answer">Short Answer</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={form.points || 1}
                  onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))}
                  className="border rounded px-2 py-1 w-20"
                  placeholder="Points"
                  required
                />
              </div>
              <input
                type="text"
                value={form.questionText || ""}
                onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))}
                placeholder="Question text"
                className="border rounded px-2 py-1 w-full"
                required
              />
              {renderOptions()}
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <div className="flex justify-end">
                <Button type="submit">Add Question</Button>
              </div>
            </form>
          </div>
        )}
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AssessmentTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState<Partial<Template>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState<{ open: boolean, templateId: number | null }>({ open: false, templateId: null });

  const fetchTemplates = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const res = await fetch("/api/assessment-templates", {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const fetchCategories = async () => {
    setCategoryLoading(true);
    const token = localStorage.getItem("token");
    const res = await fetch("/api/assessment-categories", {
      headers: { "Authorization": `Bearer ${token}` },
    });
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
    setCategoryLoading(false);
  };

  useEffect(() => { fetchTemplates(); fetchCategories(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const res = await fetch("/api/assessment-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(newCategory),
    });
    const data = await res.json();
    setShowCategoryModal(false);
    setNewCategory({ name: "", description: "" });
    await fetchCategories();
    // Select the new category in the form
    setForm(f => ({ ...f, categoryId: data.id }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const user = getCurrentUser();
    // Prevent submission if categoryId is missing
    if (!form.categoryId) {
      alert("Please select a category.");
      return;
    }
    let newTemplateId: number | null = null;
    if (editingId) {
      await fetch(`/api/assessment-templates/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ...form, categoryId: Number(form.categoryId), createdBy: user?.id }),
      });
      newTemplateId = editingId;
    } else {
      const res = await fetch(`/api/assessment-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ...form, categoryId: Number(form.categoryId), createdBy: user?.id }),
      });
      const data = await res.json();
      newTemplateId = data.id;
    }
    setForm({});
    setEditingId(null);
    fetchTemplates();
    // Open question manager modal for the new template
    if (newTemplateId) {
      setShowQuestionModal({ open: true, templateId: newTemplateId });
    }
  };

  const handleEdit = (tpl: Template) => {
    setForm(tpl);
    setEditingId(tpl.id);
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem("token");
    await fetch(`/api/assessment-templates/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
    fetchTemplates();
  };

  const handleDuplicate = (tpl: Template) => {
    // Prepare a new template object for editing, not saving immediately
    setForm({
      title: tpl.title + " (Copy)",
      description: tpl.description || "",
      categoryId: tpl.categoryId,
      durationMinutes: tpl.durationMinutes,
      passingScore: tpl.passingScore,
      isActive: tpl.isActive,
      // Do not include id, createdBy, createdAt
    });
    setEditingId(null); // New template, not editing existing
  };

  const user = getCurrentUser();
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
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
            <Link href="/admin" className="flex items-center space-x-3 px-4 py-3 h-12 rounded-lg text-gray-700 hover:bg-gray-100">
              <BarChart3 className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            <Link href="/admin/jobs" className="flex items-center space-x-3 px-4 py-3 h-12 rounded-lg text-gray-700 hover:bg-gray-100">
              <Briefcase className="h-5 w-5" />
              <span>Job Management</span>
            </Link>
            <Link href="/admin/pipeline" className="flex items-center space-x-3 px-4 py-3 h-12 rounded-lg text-gray-700 hover:bg-gray-100">
              <Users className="h-5 w-5" />
              <span>Recruitment Pipeline</span>
            </Link>
            <Link href="/admin/email-templates" className="flex items-center space-x-3 px-4 py-3 h-12 rounded-lg text-gray-700 hover:bg-gray-100">
              <Calendar className="h-5 w-5" />
              <span>Email Templates</span>
            </Link>
            <Link href="/admin/assessment-templates" className="flex items-center space-x-3 px-4 py-3 h-12 rounded-lg bg-primary text-white">
              <FileText className="h-5 w-5" />
              <span>Assessment Templates</span>
            </Link>
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Assessment Templates</h2>
              <p className="text-gray-600">Create and manage assessment templates for job postings</p>
            </div>
          </div>
          {/* Assessment Template Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <input name="title" value={form.title || ""} onChange={handleChange} placeholder="Title" required className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <Select
                  value={form.categoryId ? String(form.categoryId) : ""}
                  onValueChange={value => {
                    if (value === "__add_new__") {
                      setShowCategoryModal(true);
                    } else {
                      setForm(f => ({ ...f, categoryId: Number(value) }));
                    }
                  }}
                  disabled={categoryLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                    <SelectItem value="__add_new__">+ Add new category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <input name="durationMinutes" value={form.durationMinutes || ""} onChange={handleChange} placeholder="Duration (min)" type="number" required className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <input name="passingScore" value={form.passingScore || ""} onChange={handleChange} placeholder="Passing Score" type="number" required className="w-full border rounded px-3 py-2" />
              </div>
              <div className="md:col-span-2">
                <textarea name="description" value={form.description || ""} onChange={handleChange} placeholder="Description" className="w-full border rounded px-3 py-2" />
              </div>
              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input name="isActive" type="checkbox" checked={form.isActive || false} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="mr-2" /> Active
                </label>
              </div>
            </div>
            <div>
              <Button type="submit">{editingId ? "Update" : "Create"}</Button>
              {editingId && <Button type="button" variant="outline" className="ml-2" onClick={() => { setForm({}); setEditingId(null); }}>Cancel</Button>}
            </div>
          </form>
          {/* Add Category Modal */}
          <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>Enter a name and (optional) description for the new category.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <input
                  name="name"
                  value={newCategory.name}
                  onChange={e => setNewCategory(c => ({ ...c, name: e.target.value }))}
                  placeholder="Category name"
                  required
                  className="w-full border rounded px-3 py-2"
                />
                <textarea
                  name="description"
                  value={newCategory.description}
                  onChange={e => setNewCategory(c => ({ ...c, description: e.target.value }))}
                  placeholder="Description (optional)"
                  className="w-full border rounded px-3 py-2"
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowCategoryModal(false)}>Cancel</Button>
                  <Button type="submit">Add Category</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          {/* Assessment Templates Table */}
          {loading ? <p>Loading...</p> : (
            <div className="overflow-x-auto">
              <table className="min-w-full border rounded">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Title</th>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Duration</th>
                    <th className="px-4 py-2 text-left">Passing</th>
                    <th className="px-4 py-2 text-left">Active</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(templates) && templates.map(tpl => (
                    <tr key={tpl.id} className="border-t">
                      <td className="px-4 py-2">{tpl.title}</td>
                      <td className="px-4 py-2">{tpl.categoryId}</td>
                      <td className="px-4 py-2">{tpl.durationMinutes}</td>
                      <td className="px-4 py-2">{tpl.passingScore}</td>
                      <td className="px-4 py-2">{tpl.isActive ? "Yes" : "No"}</td>
                      <td className="px-4 py-2 space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(tpl)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(tpl.id)}>Delete</Button>
                        <Button size="sm" variant="outline" onClick={() => handleDuplicate(tpl)}>Duplicate</Button>
                        <Button size="sm" variant="outline" onClick={() => setPreviewTemplate(tpl)}>Preview</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Preview Template Modal */}
          <Dialog open={!!previewTemplate} onOpenChange={open => !open && setPreviewTemplate(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assessment Template Preview</DialogTitle>
              </DialogHeader>
              {previewTemplate && (
                <div className="space-y-2">
                  <div><strong>Title:</strong> {previewTemplate.title}</div>
                  <div><strong>Description:</strong> {previewTemplate.description}</div>
                  <div><strong>Category:</strong> {categories.find(c => c.id === previewTemplate.categoryId)?.name || previewTemplate.categoryId}</div>
                  <div><strong>Duration (min):</strong> {previewTemplate.durationMinutes}</div>
                  <div><strong>Passing Score:</strong> {previewTemplate.passingScore}</div>
                  <div><strong>Active:</strong> {previewTemplate.isActive ? "Yes" : "No"}</div>
                </div>
              )}
              <div className="flex justify-end mt-4">
                <Button onClick={() => setPreviewTemplate(null)}>Close</Button>
              </div>
            </DialogContent>
          </Dialog>
          {/* Question Manager Modal */}
          <QuestionManagerModal
            templateId={showQuestionModal.templateId || 0}
            open={showQuestionModal.open && !!showQuestionModal.templateId}
            onClose={() => setShowQuestionModal({ open: false, templateId: null })}
          />
        </main>
      </div>
    </div>
  );
} 