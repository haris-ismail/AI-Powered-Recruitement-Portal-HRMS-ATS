import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function EmailDraftModal({ candidate, template, onClose }: { candidate: any; template: any; onClose: () => void }) {
  console.log('🎯 EmailDraftModal received template:', template);
  console.log('🎯 EmailDraftModal received candidate:', candidate);
  
  // Simple template filling without complex logic
  const fillTemplate = (text: string) => {
    if (!text || !candidate) return text;
    
    return text
      .replace(/{firstName}/g, candidate.firstName || '')
      .replace(/{lastName}/g, candidate.lastName || '')
      .replace(/{email}/g, candidate.email || '')
      .replace(/{fullName}/g, `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim())
      .replace(/{company}/g, 'NASTP')
      .replace(/{date}/g, new Date().toLocaleDateString())
      .replace(/{time}/g, new Date().toLocaleTimeString());
  };

  const getInitialBody = () => {
    if (!template || !template.body) {
      return '';
    }
    return fillTemplate(template.body);
  };

  const getInitialSubject = () => {
    if (!template || !template.subject) {
      return '';
    }
    return fillTemplate(template.subject);
  };

  const [subject, setSubject] = useState(getInitialSubject());
  const [body, setBody] = useState(getInitialBody());

  const handleSend = async () => {
    try {
      console.log('📧 Attempting to send email...');
      
      // Get current user ID from the auth endpoint
      const userResponse = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (!userResponse.ok) {
        alert("User not authenticated. Please log in again.");
        return;
      }
      
      const user = await userResponse.json();
      if (!user.id) {
        alert("User not authenticated. Please log in again.");
        return;
      }

      console.log('📧 Sending email with data:', {
        templateId: template?.id,
        candidateId: candidate?.id,
        adminId: user.id,
        subject,
        body
      });

      // Debug: Log what we're sending
      const emailData = {
        templateId: template?.id,
        candidateId: candidate?.id,
        adminId: user.id,
        subject: subject,
        body: body
      };
      
      console.log('📧 Sending email data:', emailData);
      console.log('📧 Candidate object:', candidate);
      console.log('📧 Candidate email:', candidate?.email);
      console.log('📧 Candidate firstName:', candidate?.firstName);
      console.log('📧 Candidate lastName:', candidate?.lastName);
      console.log('📧 Candidate ID:', candidate?.id);
      console.log('📧 User object:', user);
      
      // Validate candidate email before sending
      if (!candidate?.email) {
        console.error('❌ CRITICAL: Candidate email is missing!');
        console.error('❌ Full candidate object:', JSON.stringify(candidate, null, 2));
        alert('Candidate email is missing. Cannot send email.');
        return;
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(emailData)
      });

      console.log('📧 Email send response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send email');
      }

      const result = await response.json();
      console.log('📧 Email send success:', result);
      alert(`Email sent successfully to ${result.recipient}!`);
      onClose();
    } catch (error) {
      console.error('❌ Error sending email:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!template) {
    return (
      <Dialog open onOpenChange={onClose}>
        <div className="p-6 bg-white rounded shadow-lg max-w-lg mx-auto">
          <h2 className="text-lg font-semibold mb-4 text-red-600">Error</h2>
          <p>No template selected. Please try again.</p>
          <div className="mt-4 text-right">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <div className="p-6 bg-white rounded shadow-lg max-w-lg mx-auto">
        <h2 className="text-lg font-semibold mb-4">Draft Email</h2>
        
        {/* Debug Info */}
        <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
          <div><strong>Debug Info:</strong></div>
          <div>Template ID: {template?.id}</div>
          <div>Template Subject: {template?.subject}</div>
          <div>Template Body Length: {template?.body?.length || 0}</div>
          <div>Candidate ID: {candidate?.id}</div>
          <div>Candidate Email: {candidate?.email}</div>
        </div>
        
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">To</label>
          <input 
            type="text" 
            value={candidate?.email || ''} 
            disabled 
            className="w-full border rounded px-2 py-1 bg-gray-100" 
          />
        </div>
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Subject</label>
          <input 
            type="text" 
            value={subject} 
            onChange={e => setSubject(e.target.value)} 
            className="w-full border rounded px-2 py-1" 
          />
        </div>
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Body</label>
          <textarea 
            value={body} 
            onChange={e => setBody(e.target.value)} 
            rows={8} 
            className="w-full border rounded px-2 py-1" 
          />
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend}>Send Email</Button>
        </div>
      </div>
    </Dialog>
  );
} 