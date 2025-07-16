import React, { useEffect, useState } from "react";

interface Assessment {
  id: number;
  title: string;
  status: string;
  templateId: number;
}

export default function CandidateAssessmentsPage() {
  const [pending, setPending] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    const res = await fetch("/api/candidate/assessments/pending");
    const data = await res.json();
    setPending(data);
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, []);

  const handleStart = async (templateId: number) => {
    // Start assessment (get attemptId)
    const res = await fetch(`/api/assessments/${templateId}/start`);
    const data = await res.json();
    // Redirect to take-assessment page with attemptId
    window.location.href = `/candidate/take-assessment?attemptId=${data.attemptId}`;
  };

  return (
    <div>
      <h1>Pending Assessments</h1>
      {loading ? <p>Loading...</p> : (
        <ul>
          {pending.map(a => (
            <li key={a.id}>
              {a.title} - Status: {a.status}
              <button onClick={() => handleStart(a.templateId)}>Start</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 