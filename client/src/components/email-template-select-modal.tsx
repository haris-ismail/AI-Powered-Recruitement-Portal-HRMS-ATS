import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import EmailDraftModal from "./email-draft-modal";

interface EmailTemplate {
  id: number;
  subject: string;
  templateContent: string;
}

export default function EmailTemplateSelectModal({ candidate, onClose }: { candidate: any; onClose: () => void }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showDraft, setShowDraft] = useState(false);

  useEffect(() => {
    fetch("/api/email-templates", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(res => res.json())
      .then(data => {
        setTemplates(data);
        setLoading(false);
      });
  }, []);

  if (showDraft && selectedTemplate) {
    return (
      <EmailDraftModal
        candidate={candidate}
        template={selectedTemplate}
        onClose={onClose}
      />
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <div className="p-6 bg-white rounded shadow-lg max-w-md mx-auto">
        <h2 className="text-lg font-semibold mb-4">Select Email Template</h2>
        {loading ? (
          <div>Loading templates...</div>
        ) : (
          <div className="space-y-2">
            {templates.map((tpl) => (
              <Button
                key={tpl.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setSelectedTemplate(tpl);
                  setShowDraft(true);
                }}
              >
                {tpl.subject}
              </Button>
            ))}
          </div>
        )}
        <div className="mt-4 text-right">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Dialog>
  );
} 