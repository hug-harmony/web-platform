// app/resend-verification/page.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import logo from "../../../public/hh-logo.png";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormData = z.infer<typeof formSchema>;

export default function ResendVerificationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  // Countdown timer for cooldown
  useState(() => {
    if (cooldown > 0) {
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
    }
  });

  const onSubmit = async (values: FormData) => {
    if (cooldown > 0) return;

    try {
      setIsLoading(true);

      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "COOLDOWN" && data.remainingSeconds) {
          setCooldown(data.remainingSeconds);
          toast.error(data.error);
          return;
        }
        throw new Error(data.error || "Failed to send verification email");
      }

      if (data.alreadyVerified) {
        toast.info("Your email is already verified. You can log in.");
        return;
      }

      setIsSuccess(true);
      toast.success("Verification email sent!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
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

          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            Check Your Email
          </h1>
          <p className="text-gray-600 mb-6">
            If an account exists with that email, we&apos;ve sent a verification
            link. Please check your inbox and spam folder.
          </p>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsSuccess(false);
                form.reset();
              }}
            >
              Send to a different email
            </Button>
            <Link href="/login">
              <Button className="w-full bg-[#E7C4BB] text-black hover:bg-[#d4a8a0]">
                Back to Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <Image
            src={logo}
            alt="Hug Harmony Logo"
            width={120}
            height={40}
            className="h-16 w-auto"
          />
        </div>

        <div className="text-center mb-6">
          <Mail className="h-12 w-12 text-[#E7C4BB] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            Resend Verification Email
          </h1>
          <p className="text-gray-600 text-sm">
            Enter your email address and we&apos;ll send you a new verification
            link.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-[#E7C4BB] text-black hover:bg-[#d4a8a0]"
              disabled={isLoading || cooldown > 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : cooldown > 0 ? (
                `Wait ${cooldown}s`
              ) : (
                "Send Verification Email"
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Remember your password?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Back to Login
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
