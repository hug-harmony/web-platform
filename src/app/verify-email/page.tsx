// app/verify-email/page.tsx

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import logo from "../../../public/hh-logo.png";

type VerificationStatus = "loading" | "success" | "error" | "already_verified";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token provided");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus("success");
        } else {
          if (data.error?.includes("already verified")) {
            setStatus("already_verified");
          } else {
            setStatus("error");
            setErrorMessage(data.error || "Verification failed");
          }
        }
      } catch {
        setStatus("error");
        setErrorMessage("An error occurred during verification");
      }
    };

    verifyEmail();
  }, [token]);

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

      {status === "loading" && (
        <div className="space-y-4">
          <Loader2 className="h-16 w-16 animate-spin text-[#E7C4BB] mx-auto" />
          <h1 className="text-xl font-semibold text-gray-800">
            Verifying your email...
          </h1>
          <p className="text-gray-600">Please wait a moment.</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-xl font-semibold text-gray-800">
            Email Verified!
          </h1>
          <p className="text-gray-600">
            Your email has been successfully verified. You can now access all
            features of Hug Harmony.
          </p>
          <Button
            className="w-full bg-[#E7C4BB] text-black hover:bg-[#d4a8a0]"
            onClick={() => router.push("/login")}
          >
            Continue to Login
          </Button>
        </div>
      )}

      {status === "already_verified" && (
        <div className="space-y-4">
          <CheckCircle2 className="h-16 w-16 text-blue-500 mx-auto" />
          <h1 className="text-xl font-semibold text-gray-800">
            Already Verified
          </h1>
          <p className="text-gray-600">
            Your email has already been verified. You can log in to your
            account.
          </p>
          <Button
            className="w-full bg-[#E7C4BB] text-black hover:bg-[#d4a8a0]"
            onClick={() => router.push("/login")}
          >
            Go to Login
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <XCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-xl font-semibold text-gray-800">
            Verification Failed
          </h1>
          <p className="text-gray-600">{errorMessage}</p>
          <div className="space-y-2">
            <Button
              className="w-full bg-[#E7C4BB] text-black hover:bg-[#d4a8a0]"
              onClick={() => router.push("/login")}
            >
              Go to Login
            </Button>
            <p className="text-sm text-gray-500">
              Need a new verification link?{" "}
              <Link
                href="/resend-verification"
                className="text-blue-600 hover:underline"
              >
                Resend verification email
              </Link>
            </p>
          </div>
        </div>
      )}
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
      <Loader2 className="h-16 w-16 animate-spin text-[#E7C4BB] mx-auto" />
      <h1 className="text-xl font-semibold text-gray-800 mt-4">
        Verifying your email...
      </h1>
      <p className="text-gray-600">Please wait a moment.</p>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <Suspense fallback={<LoadingFallback />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
