// app/auth/error/page.tsx

"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import logo from "../../../../public/hh-logo.png";

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "Access denied. You do not have permission to sign in.",
  Verification: "The verification link may have expired or already been used.",
  OAuthSignin: "Error starting the sign-in process. Please try again.",
  OAuthCallback: "Error during the sign-in process. Please try again.",
  OAuthCreateAccount:
    "Could not create an account. The email may already be in use.",
  EmailCreateAccount: "Could not create an account. Please try again.",
  Callback: "Error during authentication callback.",
  OAuthAccountNotLinked:
    "This email is already associated with another account. Please sign in with the original method.",
  EmailSignin: "Error sending the verification email.",
  CredentialsSignin:
    "Invalid credentials. Please check your email/username and password.",
  SessionRequired: "Please sign in to access this page.",
  Default: "An error occurred during authentication. Please try again.",
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";

  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
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
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            Authentication Error
          </h1>
          <p className="text-gray-600 text-sm">{errorMessage}</p>
        </div>

        <div className="space-y-3">
          <Link href="/login">
            <Button className="w-full bg-[#E7C4BB] text-black hover:bg-[#d4a8a0]">
              Back to Login
            </Button>
          </Link>

          <Link href="/">
            <Button variant="outline" className="w-full">
              Go to Homepage
            </Button>
          </Link>
        </div>

        {error === "OAuthAccountNotLinked" && (
          <p className="mt-4 text-xs text-gray-500">
            If you previously signed up with a different method (email, Google,
            Apple, or Facebook), please use that method to sign in.
          </p>
        )}
      </Card>
    </div>
  );
}
