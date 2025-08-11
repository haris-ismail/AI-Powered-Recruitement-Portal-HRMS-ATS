import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import EmailDraftModal from "./email-draft-modal";

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
}

export default function EmailTemplateSelectModal({ candidate, onClose }: { candidate: any; onClose: () => void }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showDraft, setShowDraft] = useState(false);

  // Debug: Log candidate data
  console.log('🎯 EmailTemplateSelectModal received candidate:', candidate);
  console.log('🎯 Candidate email:', candidate?.email);
  console.log('🎯 Candidate ID:', candidate?.id);
  console.log('🎯 Candidate name:', candidate?.firstName, candidate?.lastName);
  console.log('🎯 Full candidate object:', JSON.stringify(candidate, null, 2));

  useEffect(() => {
    console.log('🔄 EmailTemplateSelectModal: Starting to fetch templates...');
    
    // Try multiple approaches to get templates
    const fetchTemplates = async () => {
      try {
        // Approach 1: Try the test endpoint first
        console.log('🧪 Trying test endpoint...');
        const testResponse = await fetch('/api/test-email-templates');
        console.log('🧪 Test endpoint response status:', testResponse.status);
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log('🧪 Test endpoint data:', testData);
          if (testData.success && testData.templates) {
            console.log('✅ Test endpoint successful, using templates:', testData.templates);
            setTemplates(testData.templates);
            setLoading(false);
            return;
          }
        }

        // Approach 2: Try the main endpoint with cookie-based auth
        console.log('🔐 Trying main endpoint with cookie-based auth...');
        
        const response = await fetch('/api/email-templates', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('🔐 Main endpoint response status:', response.status);
        console.log('🔐 Main endpoint response headers:', response.headers);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Main endpoint error response:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Main endpoint successful, templates:', data);
        console.log('📊 Templates count:', Array.isArray(data) ? data.length : 'Not an array');
        
        if (Array.isArray(data)) {
          setTemplates(data);
        } else {
          console.error('❌ Response is not an array:', data);
          setError('Invalid response format from server');
        }
        
      } catch (error) {
        console.error('❌ Error fetching email templates:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
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
        
        {/* Debug Info */}
        <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
          <div><strong>Debug Info:</strong></div>
          <div>Loading: {loading ? 'Yes' : 'No'}</div>
          <div>Templates Count: {templates.length}</div>
          <div>Error: {error || 'None'}</div>
          <div>Candidate ID: {candidate?.id}</div>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div>Loading templates...</div>
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">
            <p>Error loading templates:</p>
            <p className="text-sm">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-2"
              variant="outline"
            >
              Retry
            </Button>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p>No email templates found.</p>
            <p className="text-sm">Please create some email templates first.</p>
            <div className="mt-2 text-xs text-gray-400">
              <p>Debug: Templates array length is {templates.length}</p>
              <p>Debug: Templates type is {typeof templates}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((tpl) => (
              <Button
                key={tpl.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  console.log('🎯 Selected template:', tpl);
                  setSelectedTemplate(tpl);
                  setShowDraft(true);
                }}
              >
                <div className="text-left">
                  <div className="font-medium">{tpl.subject}</div>
                  <div className="text-xs text-gray-500">{tpl.name}</div>
                </div>
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