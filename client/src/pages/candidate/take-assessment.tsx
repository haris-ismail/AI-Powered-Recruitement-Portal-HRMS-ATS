import React, { useEffect, useState } from "react";

interface Question {
  id: number;
  questionText: string;
  questionType: string;
  options?: any;
}

export default function TakeAssessmentPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [timer, setTimer] = useState(0);
  const [attemptId, setAttemptId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const attemptId = params.get("attemptId");
    if (attemptId) setAttemptId(Number(attemptId));
    // Fetch questions for this attempt (mocked for now)
    // TODO: fetch real questions from backend
    setQuestions([
      { id: 1, questionText: "Q1", questionType: "mcq_single" },
      { id: 2, questionText: "Q2", questionType: "short_answer" },
    ]);
    setTimer(60 * 10); // 10 min for demo
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  const handleAnswer = (qid: number, value: any) => {
    setAnswers({ ...answers, [qid]: value });
    // TODO: auto-save to backend
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    await fetch(`/api/assessments/${attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    window.location.href = `/candidate/assessment-results?attemptId=${attemptId}`;
  };

  return (
    <div>
      <h1>Take Assessment</h1>
      <div>Time left: {Math.floor(timer/60)}:{(timer%60).toString().padStart(2,'0')}</div>
      <div>Progress: {current+1} / {questions.length}</div>
      {questions.length > 0 && (
        <div>
          <div>{questions[current].questionText}</div>
          <input onChange={e => handleAnswer(questions[current].id, e.target.value)} />
        </div>
      )}
      <button disabled={current===0} onClick={() => setCurrent(current-1)}>Prev</button>
      <button disabled={current===questions.length-1} onClick={() => setCurrent(current+1)}>Next</button>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
} 