import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function fillTemplate(template: string, candidate: any) {
  return template
    .replace(/{firstName}/g, candidate.firstName || "")
    .replace(/{lastName}/g, candidate.lastName || "")
    .replace(/{email}/g, candidate.email || "")
    .replace(/{dateOfBirth}/g, candidate.dateOfBirth || "")
    .replace(/{city}/g, candidate.city || "");
}

export default function EmailDraftModal({ candidate, template, onClose }: { candidate: any; template: any; onClose: () => void }) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(fillTemplate(template.templateContent, candidate));

  const handleSend = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(candidate.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <div className="p-6 bg-white rounded shadow-lg max-w-lg mx-auto">
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
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend}>Send via Gmail</Button>
        </div>
      </div>
    </Dialog>
  );
} 