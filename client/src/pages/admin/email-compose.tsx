import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

// Defensive fillTemplate function
function fillTemplate(body: string | undefined, candidate: any) {
  if (typeof body !== "string") return "";
  return body
    .replace(/{firstName}/g, candidate?.firstName || "")
    .replace(/{lastName}/g, candidate?.lastName || "")
    .replace(/{email}/g, candidate?.email || "")
    .replace(/{dateOfBirth}/g, candidate?.dateOfBirth || "")
    .replace(/{city}/g, candidate?.city || "");
}

export default function EmailComposePage() {
  const [location, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const candidateId = params.get("candidateId");
  const templateId = params.get("templateId");

  const [candidate, setCandidate] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch candidate info
  useEffect(() => {
    if (candidateId) {
      fetch(`/api/candidates/${candidateId}`, { 
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      })
        .then(res => res.json())
        .then(data => {
          console.log("Fetched candidate:", data);
          setCandidate(data);
        })
        .catch(err => {
          console.error("Error fetching candidate:", err);
          setCandidate(null);
        });
    }
  }, [candidateId]);

  // Fetch templates
  useEffect(() => {
    fetch("/api/email-templates", { 
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    })
      .then(res => res.json())
      .then(data => {
        console.log("Fetched templates:", data);
        setTemplates(data);
      })
      .catch(err => {
        console.error("Error fetching templates:", err);
        setTemplates([]);
      });
  }, []);

  // Handle template selection when templateId changes
  useEffect(() => {
    if (templateId && templates.length > 0 && candidate) {
      const tpl = templates.find(t => t.id.toString() === templateId);
      console.log("Selected template:", tpl);
      if (tpl) {
        setSelectedTemplate(tpl);
        setSubject(tpl.subject);
        setBody(fillTemplate(tpl.body, candidate));
      }
    }
  }, [templateId, templates, candidate]);

  // Wait for both candidate and templates to load
  useEffect(() => {
    if (candidate && templates.length > 0) {
      setLoading(false);
    }
  }, [candidate, templates]);

  if (loading) return <div className="p-8">Loading...</div>;

  if (!candidate) return <div className="p-8 text-red-600">Error: Candidate not found or failed to load.</div>;

  // Step 1: Select template
  if (!selectedTemplate) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <h2 className="text-lg font-semibold mb-4">Select Email Template</h2>
        {templates.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500">No email templates available.</p>
            <Button 
              variant="ghost" 
              onClick={() => navigate("/admin/pipeline")}
              className="mt-2"
            >
              Back to Pipeline
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {templates.map((tpl) => (
                <Button
                  key={tpl.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    console.log("Selecting template:", tpl.id);
                    navigate(`/admin/email/compose?candidateId=${candidateId}&templateId=${tpl.id}`);
                  }}
                >
                  {tpl.subject}
                </Button>
              ))}
            </div>
            <div className="mt-4 text-right">
              <Button variant="ghost" onClick={() => navigate("/admin/pipeline")}>Cancel</Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Step 2: Draft and send
  function handleSend() {
    const to = candidate?.email || "";
    const subject = typeof selectedTemplate?.subject === "string"
      ? fillTemplate(selectedTemplate.subject, candidate)
      : "";
    const body = typeof selectedTemplate?.body === "string"
      ? fillTemplate(selectedTemplate.body, candidate)
      : "";

    if (!to || !subject || !body) {
      alert("Missing candidate email or template content.");
      return;
    }

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, "_blank");
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h2 className="text-lg font-semibold mb-4">Draft Email</h2>
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">To</label>
        <input type="text" value={candidate.email} disabled className="w-full border rounded px-2 py-1 bg-gray-100" />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Subject</label>
        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full border rounded px-2 py-1" />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Body</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} className="w-full border rounded px-2 py-1" />
      </div>
      <div className="mt-4 flex justify-end space-x-2">
        <Button variant="ghost" onClick={() => navigate("/admin/pipeline")}>Cancel</Button>
        <Button onClick={handleSend}>Send via Gmail</Button>
      </div>
    </div>
  );
} 