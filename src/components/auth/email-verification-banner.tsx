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

  // Don't show if verified, dismissed, or no session
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

      // Reset success state after 5 seconds
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
    // Trigger session update to check if email is now verified
    await update();
    toast.info("Session refreshed");
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-medium">Verify your email</span> to access
              all features like messaging and booking appointments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-white border-amber-300 hover:bg-amber-100"
              onClick={handleResend}
              disabled={isResending || resendSuccess}
            >
              {isResending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Sending...
                </>
              ) : resendSuccess ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                  Sent!
                </>
              ) : (
                "Resend Email"
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100"
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
