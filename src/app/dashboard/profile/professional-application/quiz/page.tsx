"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Question {
  id: string;
  text: string;
  options: { id: string; text: string; correct: boolean }[];
}

export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchQuiz();
  }, [status, router]);

  const fetchQuiz = async () => {
    try {
      const res = await fetch("/api/professionals/onboarding/quiz/questions", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setQuestions(data);
    } catch {
      toast.error("Failed to load quiz");
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error("Answer all questions");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/professionals/onboarding/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, answerId]) => ({
            questionId,
            answerId,
          })),
        }),
        credentials: "include",
      });

      const result = await res.json();
      if (result.passed) {
        toast.success(`Passed! Score: ${result.score}%`);
        router.push("/dashboard/profile/professional-application/status");
      } else {
        toast.error(`Failed. Score: ${result.score}%. Retry in 24h.`);
        router.push(
          "/dashboard/profile/professional-application/quiz/cooldown"
        );
      }
    } catch {
      toast.error("Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || questions.length === 0)
    return (
      <div className="p-4">
        <Card>
          <CardContent>
            <p className="py-8 text-center">Loading quiz...</p>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <motion.div
      className="p-4 space-y-6 max-w-2xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/profile/professional-application/video">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Link>
            </Button>
            <CardTitle>Step 3: Knowledge Quiz</CardTitle>
            <div className="w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.map((q, i) => (
            <div key={q.id} className="space-y-3">
              <p className="font-medium">
                Question {i + 1}: {q.text}
              </p>
              <RadioGroup
                value={answers[q.id]}
                onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}
              >
                {q.options.map((opt) => (
                  <div key={opt.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.id} id={opt.id} />
                    <Label htmlFor={opt.id} className="cursor-pointer">
                      {opt.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
          <Button
            onClick={handleSubmit}
            disabled={
              submitting || Object.keys(answers).length < questions.length
            }
            className="w-full bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black rounded-full"
          >
            {submitting ? "Submitting..." : "Submit Quiz"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
