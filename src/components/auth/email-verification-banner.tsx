// components/auth/email-verification-banner.tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function EmailVerificationBanner() {
  const { data: session, update } = useSession();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  if (!session?.user || session.user.emailVerified || isDismissed) {
    return null;
  }

  const handleResend = async () => {
    try {
      setIsResending(true);

      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification email");
      }

      setResendSuccess(true);
      toast.success("Verification email sent! Check your inbox.");

      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send email"
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleRefresh = async () => {
    await update();
    toast.info("Session refreshed");
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-amber-800 truncate">
              <span className="font-medium">Verify your email</span>
              <span className="hidden sm:inline text-amber-700">
                {" "}
                to access all features
              </span>
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 sm:h-8 px-2 sm:px-3 bg-white border-amber-300 hover:bg-amber-100"
              onClick={handleResend}
              disabled={isResending || resendSuccess}
            >
              {isResending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin sm:mr-1" />
                  <span className="hidden sm:inline">Sending...</span>
                </>
              ) : resendSuccess ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-green-600 sm:mr-1" />
                  <span className="hidden sm:inline">Sent!</span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">Resend</span>
                  <span className="hidden sm:inline">Resend Email</span>
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 sm:h-8 px-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100 hidden sm:inline-flex"
              onClick={handleRefresh}
            >
              I&apos;ve verified
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
