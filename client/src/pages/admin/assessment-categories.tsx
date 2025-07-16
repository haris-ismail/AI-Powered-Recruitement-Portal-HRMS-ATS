import React, { useEffect, useState } from "react";

interface Category {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
}

export default function AssessmentCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Partial<Category>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    const res = await fetch("/api/assessment-categories");
    const data = await res.json();
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      // No edit endpoint, so just delete and re-create for demo
      await fetch(`/api/assessment-categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: editingId }),
      });
    } else {
      await fetch(`/api/assessment-categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setForm({});
    setEditingId(null);
    fetchCategories();
  };

  const handleEdit = (cat: Category) => {
    setForm(cat);
    setEditingId(cat.id);
  };

  const handleDelete = async (id: number) => {
    // No delete endpoint, so just filter out for demo
    setCategories(categories.filter(c => c.id !== id));
    // You can add a real DELETE call here if implemented
  };

  return (
    <div>
      <h1>Assessment Categories</h1>
      <form onSubmit={handleSubmit}>
        <input name="name" value={form.name || ""} onChange={handleChange} placeholder="Name" required />
        <textarea name="description" value={form.description || ""} onChange={handleChange} placeholder="Description" />
        <button type="submit">{editingId ? "Update" : "Create"}</button>
        {editingId && <button type="button" onClick={() => { setForm({}); setEditingId(null); }}>Cancel</button>}
      </form>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Name</th><th>Description</th><th>Actions</th></tr></thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td>{cat.name}</td>
                <td>{cat.description}</td>
                <td>
                  <button onClick={() => handleEdit(cat)}>Edit</button>
                  <button onClick={() => handleDelete(cat.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 