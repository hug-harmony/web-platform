// app/dashboard/edit-profile/professional-application/quiz/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Question {
  id: string;
  text: string;
  options: { id: string; text: string; correct: boolean }[];
}

type PageStatus =
  | "loading"
  | "error"
  | "not_eligible"
  | "already_passed"
  | "ready";

export default function QuizPage() {
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(
    null
  );

  const { status } = useSession();
  const router = useRouter();

  // Check eligibility and fetch quiz
  const initialize = useCallback(async () => {
    try {
      // First check application status
      const statusRes = await fetch("/api/professionals/onboarding/status", {
        credentials: "include",
      });

      if (!statusRes.ok) {
        setPageStatus("error");
        return;
      }

      const statusData = await statusRes.json();
      setApplicationStatus(statusData.step);

      // No application - redirect to form
      if (!statusData.application || statusData.step === "FORM") {
        router.push("/dashboard/edit-profile/professional-application");
        return;
      }

      // Video not completed - redirect to video
      if (statusData.step === "VIDEO_PENDING") {
        router.push("/dashboard/edit-profile/professional-application/video");
        return;
      }

      // Already passed - show success state but allow viewing
      if (
        statusData.step === "QUIZ_PASSED" ||
        statusData.step === "ADMIN_REVIEW" ||
        statusData.step === "APPROVED"
      ) {
        setPageStatus("already_passed");
        return;
      }

      // Check cooldown for failed attempts
      if (statusData.step === "QUIZ_FAILED") {
        const cooldownRes = await fetch(
          "/api/professionals/onboarding/quiz/cooldown",
          { credentials: "include" }
        );

        if (cooldownRes.ok) {
          const cooldownData = await cooldownRes.json();
          if (!cooldownData.eligible) {
            router.push(
              "/dashboard/edit-profile/professional-application/quiz/cooldown"
            );
            return;
          }
        }
      }

      // Fetch questions
      const questionsRes = await fetch(
        "/api/professionals/onboarding/quiz/questions",
        { credentials: "include" }
      );

      if (!questionsRes.ok) {
        throw new Error("Failed to load questions");
      }

      const questionsData = await questionsRes.json();
      setQuestions(questionsData);
      setPageStatus("ready");
    } catch (error) {
      console.error("Initialize error:", error);
      toast.error("Failed to load quiz");
      setPageStatus("error");
    }
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      initialize();
    }
  }, [status, router, initialize]);

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error("Please answer all questions before submitting");
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

      if (!res.ok) {
        throw new Error(result.error || "Submission failed");
      }

      if (result.passed) {
        toast.success(
          `🎉 Congratulations! You passed with ${Math.round(result.score)}%`
        );
        router.push("/dashboard/edit-profile/professional-application/status");
      } else {
        toast.error(
          `Score: ${Math.round(result.score)}%. You need 80% to pass. Try again in 24 hours.`
        );
        router.push(
          "/dashboard/edit-profile/professional-application/quiz/cooldown"
        );
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  // Loading state
  if (status === "loading" || pageStatus === "loading") {
    return <LoadingSkeleton />;
  }

  // Error state
  if (pageStatus === "error") {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load quiz. Please try again.
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => {
                setPageStatus("loading");
                initialize();
              }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Already passed state
  if (pageStatus === "already_passed") {
    return (
      <motion.div
        className="p-4 space-y-6 max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                <Link href="/dashboard/edit-profile/professional-application/status">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Link>
              </Button>
              <CardTitle className="text-xl text-black">
                Quiz Completed
              </CardTitle>
              <div className="w-20" />
            </div>
          </CardHeader>
        </Card>

        <Alert className="border-green-500 bg-green-50">
          <Trophy className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">
            You&apos;ve Already Passed!
          </AlertTitle>
          <AlertDescription className="text-green-700">
            Great job! You&apos;ve already completed the quiz successfully.
            {applicationStatus === "APPROVED" ? (
              <span> Your application has been approved!</span>
            ) : (
              <span> Your application is under review.</span>
            )}
          </AlertDescription>
        </Alert>

        <Card className="shadow-lg">
          <CardContent className="p-6 space-y-4">
            <p className="text-muted-foreground">
              You can view your application status or return to the dashboard.
            </p>
            <div className="flex gap-3">
              <Button
                asChild
                className="flex-1 bg-[#F3CFC6] hover:bg-[#e5b8ad] text-black rounded-full"
              >
                <Link href="/dashboard/edit-profile/professional-application/status">
                  View Application Status
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 rounded-full">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-2 items-start justify-between">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Link href="/dashboard/edit-profile/professional-application/status">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Status
              </Link>
            </Button>
            <CardTitle className="text-xl text-black">
              Step 3: Knowledge Quiz
            </CardTitle>
            <div className="w-20" />
          </div>
        </CardHeader>
      </Card>

      {/* Dev Mode Notice */}
      <Alert className="border-amber-500 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Development Mode</AlertTitle>
        <AlertDescription className="text-amber-700">
          Correct answers are highlighted for testing purposes.
        </AlertDescription>
      </Alert>

      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Answered: {answeredCount} / {questions.length}
        </span>
        <span>Required to pass: 80%</span>
      </div>

      {/* Questions */}
      <Card className="shadow-lg">
        <CardContent className="p-6 space-y-8">
          {questions.map((q, i) => {
            const correctOpt = q.options.find((o) => o.correct);

            return (
              <motion.div
                key={q.id}
                className="space-y-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <p className="font-medium text-lg">
                  <span className="text-[#F3CFC6] mr-2">Q{i + 1}.</span>
                  {q.text}
                </p>

                <RadioGroup
                  value={answers[q.id]}
                  onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}
                  className="space-y-2"
                >
                  {q.options.map((opt) => {
                    const isCorrect = opt.correct;
                    const isSelected = answers[q.id] === opt.id;

                    return (
                      <div
                        key={opt.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 ${
                          isCorrect
                            ? "bg-green-50 border-green-300"
                            : isSelected
                              ? "bg-[#F3CFC6]/20 border-[#F3CFC6]"
                              : "border-gray-200"
                        }`}
                      >
                        <RadioGroupItem
                          value={opt.id}
                          id={`${q.id}-${opt.id}`}
                        />
                        <Label
                          htmlFor={`${q.id}-${opt.id}`}
                          className="flex-1 cursor-pointer flex items-center justify-between"
                        >
                          <span>{opt.text}</span>
                          {isCorrect && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>

                {/* Dev mode: Show correct answer */}
                {correctOpt && (
                  <p className="text-sm text-green-700 font-medium pl-2">
                    ✓ Correct: {correctOpt.text}
                  </p>
                )}

                {i < questions.length - 1 && (
                  <div className="border-b border-dashed pt-4" />
                )}
              </motion.div>
            );
          })}

          {/* Submit Button */}
          <div className="pt-6 border-t">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !allAnswered}
              className="w-full bg-[#F3CFC6] hover:bg-[#e5b8ad] text-black rounded-full h-12 text-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : allAnswered ? (
                "Submit Quiz"
              ) : (
                `Answer All Questions (${answeredCount}/${questions.length})`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <div className="w-28" />
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-lg">
        <CardContent className="p-6 space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
          <Skeleton className="h-12 w-full rounded-full" />
        </CardContent>
      </Card>
    </div>
  );
}
