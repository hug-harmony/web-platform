// app/verification-pending/page.tsx

"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import logo from "../../../public/hh-logo.png";

function VerificationPendingContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;

    try {
      setIsResending(true);

      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "COOLDOWN" && data.remainingSeconds) {
          setCooldown(data.remainingSeconds);
        }
        throw new Error(data.error || "Failed to resend");
      }

      setResendSuccess(true);
      toast.success("Verification email sent!");

      setTimeout(() => setResendSuccess(false), 3000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to resend email"
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-8 text-center">
      <div className="flex justify-center mb-6">
        <Image
          src={logo}
          alt="Hug Harmony Logo"
          width={120}
          height={40}
          className="h-16 w-auto"
        />
      </div>

      <div className="mb-6">
        <div className="w-16 h-16 bg-[#E7C4BB] bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="h-8 w-8 text-[#E7C4BB]" />
        </div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">
          Check Your Email
        </h1>
        <p className="text-gray-600 text-sm">
          We&apos;ve sent a verification link to:
        </p>
        {email && <p className="text-gray-800 font-medium mt-1">{email}</p>}
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-600">
          Click the link in the email to verify your account. The link will
          expire in 24 hours.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleResend}
          disabled={isResending || cooldown > 0 || !email}
        >
          {isResending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sending...
            </>
          ) : resendSuccess ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              Email Sent!
            </>
          ) : cooldown > 0 ? (
            `Resend in ${cooldown}s`
          ) : (
            "Resend Verification Email"
          )}
        </Button>

        <Link href="/login" className="block">
          <Button className="w-full bg-[#E7C4BB] text-black hover:bg-[#d4a8a0]">
            Back to Login
          </Button>
        </Link>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        <p>Didn&apos;t receive the email? Check your spam folder.</p>
        <p className="mt-2">
          Wrong email?{" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            Register again
          </Link>
        </p>
      </div>
    </Card>
  );
}

function LoadingFallback() {
  return (
    <Card className="w-full max-w-md p-8 text-center">
      <div className="flex justify-center mb-6">
        <Image
          src={logo}
          alt="Hug Harmony Logo"
          width={120}
          height={40}
          className="h-16 w-auto"
        />
      </div>
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#E7C4BB]" />
      <p className="mt-4 text-gray-600">Loading...</p>
    </Card>
  );
}

export default function VerificationPendingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <Suspense fallback={<LoadingFallback />}>
        <VerificationPendingContent />
      </Suspense>
    </div>
  );
}
