import React, { useEffect, useState } from "react";

interface Result {
  score: number;
  maxScore: number;
  passed: boolean;
  questions: any[];
}

export default function AssessmentResultsPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const attemptId = params.get("attemptId");
    const jobIdParam = params.get("jobId");
    if (jobIdParam) setJobId(Number(jobIdParam));
    if (!attemptId) return;
    setLoading(true);
    fetch(`/api/assessments/${attemptId}/results`).then(res => res.json()).then(setResult).finally(() => setLoading(false));
  }, []);

  const handleSubmitApplication = async () => {
    if (!jobId) return;
    setSubmitting(true);
    await fetch(`/api/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  if (loading) return <div>Loading...</div>;
  if (!result) return <div>No results found.</div>;

  return (
    <div>
      <h1>Assessment Results</h1>
      <div>Score: {result.score} / {result.maxScore}</div>
      <div>Status: {result.passed ? "Passed" : "Failed"}</div>
      <h2>Question Review</h2>
      <ul>
        {result.questions.map((q, i) => (
          <li key={i}>
            <div>{q.questionText}</div>
            <div>Your answer: {q.yourAnswer}</div>
            <div>Correct answer: {q.correctAnswer}</div>
            <div>{q.isCorrect ? "Correct" : "Incorrect"}</div>
          </li>
        ))}
      </ul>
      {jobId && !submitted && (
        <button onClick={handleSubmitApplication} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Application"}
        </button>
      )}
      {submitted && <div>Application submitted successfully!</div>}
    </div>
  );
} 