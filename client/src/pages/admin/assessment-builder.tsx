import React, { useEffect, useState } from "react";

interface Question {
  id: number;
  questionText: string;
  questionType: string;
  options?: any;
  correctAnswers?: any;
  points: number;
  orderIndex: number;
}

export default function AssessmentBuilderPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Question>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (templateId) fetchQuestions(templateId);
  }, [templateId]);

  const fetchQuestions = async (tid: number) => {
    const res = await fetch(`/api/assessment-templates/${tid}/questions`);
    const data = await res.json();
    setQuestions(data);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId) return;
    await fetch(`/api/assessment-templates/${templateId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({});
    fetchQuestions(templateId);
  };

  const handleEdit = (q: Question) => setForm(q);

  const handleDelete = async (id: number) => {
    await fetch(`/api/assessment-questions/${id}`, { method: "DELETE" });
    if (templateId) fetchQuestions(templateId);
  };

  // Simple drag and drop reorder
  const handleDragStart = (idx: number) => setDragIndex(idx);
  const handleDrop = (idx: number) => {
    if (dragIndex === null) return;
    const reordered = [...questions];
    const [removed] = reordered.splice(dragIndex, 1);
    reordered.splice(idx, 0, removed);
    setQuestions(reordered);
    setDragIndex(null);
    // TODO: persist new order to backend
  };

  return (
    <div>
      <h1>Assessment Builder</h1>
      <input type="number" placeholder="Template ID" value={templateId || ""} onChange={e => setTemplateId(Number(e.target.value))} />
      <form onSubmit={handleAdd}>
        <input name="questionText" value={form.questionText || ""} onChange={handleChange} placeholder="Question Text" required />
        <input name="questionType" value={form.questionType || ""} onChange={handleChange} placeholder="Type (mcq_single, etc)" required />
        <input name="points" value={form.points || ""} onChange={handleChange} placeholder="Points" type="number" required />
        <button type="submit">Add Question</button>
      </form>
      <ul>
        {questions.map((q, idx) => (
          <li key={q.id} draggable onDragStart={() => handleDragStart(idx)} onDrop={() => handleDrop(idx)}>
            <span>{q.orderIndex}. {q.questionText} ({q.questionType}) [{q.points} pts]</span>
            <button onClick={() => handleEdit(q)}>Edit</button>
            <button onClick={() => handleDelete(q.id)}>Delete</button>
            <button onClick={() => alert(JSON.stringify(q, null, 2))}>Preview</button>
          </li>
        ))}
      </ul>
      <div>
        <h2>Scoring Config & Timer</h2>
        <input placeholder="Timer (minutes)" />
        {/* Add more config as needed */}
      </div>
    </div>
  );
} 