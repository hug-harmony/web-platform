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
    text: "What is the minimum age required to use the Hug Harmoney website?",
    options: [
      { id: "a", text: "16 years", correct: false },
      { id: "b", text: "18 years", correct: true },
      { id: "c", text: "21 years", correct: false },
      { id: "d", text: "13 years", correct: false },
    ],
  },
  {
    id: "q2",
    text: "What sense does cuddling communicate to a person?",
    options: [
      { id: "a", text: "Being ignored", correct: false },
      { id: "b", text: "Being accepted and valued", correct: true },
      { id: "c", text: "Being judged", correct: false },
      { id: "d", text: "Being vulnerable", correct: false },
    ],
  },
  {
    id: "q3",
    text: "What hormone is released during affectionate touch that helps create a 'cuddle high'?",
    options: [
      { id: "a", text: "Cortisol", correct: false },
      { id: "b", text: "Adrenaline", correct: false },
      { id: "c", text: "Oxytocin", correct: true },
      { id: "d", text: "Serotonin", correct: false },
    ],
  },
  {
    id: "q4",
    text: "What kind of photos are users allowed to upload to their profile?",
    options: [
      { id: "a", text: "Nude or partially clothed photos", correct: false },
      { id: "b", text: "Photos with suggestive poses", correct: false },
      { id: "c", text: "Photos of themselves fully clothed", correct: true },
      { id: "d", text: "Photos of friends or family", correct: false },
    ],
  },
  {
    id: "q5",
    text: "How does oxytocin contribute to the bonding experience in cuddling?",
    options: [
      { id: "a", text: "Raises your guard", correct: false },
      {
        id: "b",
        text: "Creates a sense of closeness by helping people feel safe",
        correct: true,
      },
      { id: "c", text: "Blocks emotional bonding", correct: false },
      { id: "d", text: "Causes physical discomfort", correct: false },
    ],
  },
  {
    id: "q6",
    text: "Which of the following is NOT listed as a benefit of cuddling?",
    options: [
      { id: "a", text: "Helping with body image", correct: false },
      { id: "b", text: "Relieving depression and anxiety", correct: false },
      { id: "c", text: "Causing insomnia", correct: true },
      {
        id: "d",
        text: "Increasing confidence when interacting with the opposite gender",
        correct: false,
      },
    ],
  },
  {
    id: "q7",
    text: "What actions Hug Harmony may take if a user violates the Terms of Use?",
    options: [
      {
        id: "a",
        text: "Permanently ban or suspend the account",
        correct: true,
      },
      { id: "b", text: "Report to law enforcement only", correct: false },
      { id: "c", text: "Do nothing", correct: false },
      { id: "d", text: "Charge a fine", correct: false },
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
