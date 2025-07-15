import React, { useEffect, useState } from "react";

export default function AssessmentAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/assessment-analytics")
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No analytics data.</div>;

  return (
    <div>
      <h1>Assessment Analytics</h1>
      <h2>Average Score & Pass Rate</h2>
      <table>
        <thead><tr><th>Template ID</th><th>Avg Score</th><th>Pass Rate (%)</th></tr></thead>
        <tbody>
          {data.avgScores.map((row: any, i: number) => (
            <tr key={i}>
              <td>{row.template_id}</td>
              <td>{Number(row.avg_score).toFixed(2)}</td>
              <td>{Number(row.pass_rate).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Per-Question Difficulty</h2>
      <table>
        <thead><tr><th>Question ID</th><th>% Correct</th></tr></thead>
        <tbody>
          {data.questionDifficulty.map((row: any, i: number) => (
            <tr key={i}>
              <td>{row.question_id}</td>
              <td>{(Number(row.correct_pct) * 100).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Candidate Trends</h2>
      <table>
        <thead><tr><th>Candidate ID</th><th>Date</th><th>Score</th></tr></thead>
        <tbody>
          {data.candidateTrends.map((row: any, i: number) => (
            <tr key={i}>
              <td>{row.candidate_id}</td>
              <td>{row.started_at}</td>
              <td>{row.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Assessment/Job Correlation</h2>
      <table>
        <thead><tr><th>Template ID</th><th>Job ID</th><th>Score</th><th>Application Status</th></tr></thead>
        <tbody>
          {data.jobCorrelation.map((row: any, i: number) => (
            <tr key={i}>
              <td>{row.template_id}</td>
              <td>{row.job_id}</td>
              <td>{row.score}</td>
              <td>{row.application_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 