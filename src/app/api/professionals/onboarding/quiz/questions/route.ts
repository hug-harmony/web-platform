import { NextResponse } from "next/server";

interface Option {
  id: string;
  text: string;
  correct: boolean;
}

interface Question {
  id: string;
  text: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "What is the minimum age to become a professional?",
    options: [
      { id: "a", text: "16", correct: false },
      { id: "b", text: "18", correct: true },
      { id: "c", text: "21", correct: false },
    ],
  },
  {
    id: "q2",
    text: "Which of the following is NOT allowed in a session?",
    options: [
      { id: "a", text: "Recording without consent", correct: true },
      { id: "b", text: "Sharing personal stories", correct: false },
      { id: "c", text: "Offering advice", correct: false },
    ],
  },
  {
    id: "q3",
    text: "What should you do if a client expresses distress or discomfort during a session?",
    options: [
      { id: "a", text: "Ignore it and continue the session", correct: false },
      {
        id: "b",
        text: "Acknowledge it and offer to pause or stop",
        correct: true,
      },
      {
        id: "c",
        text: "End the session immediately without explanation",
        correct: false,
      },
    ],
  },
  {
    id: "q4",
    text: "When handling sensitive client information, you should:",
    options: [
      { id: "a", text: "Keep it confidential and secure", correct: true },
      { id: "b", text: "Share it with friends for feedback", correct: false },
      { id: "c", text: "Post about it on social media", correct: false },
    ],
  },
  {
    id: "q5",
    text: "Before beginning a professional session, you should always:",
    options: [
      {
        id: "a",
        text: "Ensure consent and understanding of session rules",
        correct: true,
      },
      {
        id: "b",
        text: "Start immediately without introductions",
        correct: false,
      },
      {
        id: "c",
        text: "Ask for payment before greeting the client",
        correct: false,
      },
    ],
  },
];

function shuffle<T>(array: readonly T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET() {
  const shuffled = QUESTIONS.map((q) => ({
    ...q,
    options: shuffle(q.options),
  }));
  return NextResponse.json(shuffled);
}
