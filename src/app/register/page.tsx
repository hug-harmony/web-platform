"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import Link from "next/link";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import register from "../../../public/register.webp";

type UsernameStatus = "idle" | "checking" | "available" | "unavailable";

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Only letters, numbers, and underscores are allowed"
  );

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/\d/, "Must contain at least one number")
  .regex(
    /[!@#$%^&*(),.?":{}|<>_\-\[\];'`~+/=\\]/,
    "Must contain at least one special character"
  );

const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine((val) => {
    const p = parsePhoneNumberFromString(val || "");
    return !!p?.isValid();
  }, "Enter a valid phone number in international format (e.g., +14155552671)");

const formSchema = z
  .object({
    username: usernameSchema,
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phoneNumber: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
    ageVerification: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.ageVerification === true, {
    message: "You must confirm you are over 18 and agree to the terms",
    path: ["ageVerification"],
  });

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      ageVerification: false,
    },
    mode: "onChange",
  });

  // Generate local suggestions if API doesn't return any
  const generateLocalSuggestions = (base: string) => {
    const clean = base
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    const suffixes = [
      Math.floor(Math.random() * 900 + 100).toString(),
      new Date().getFullYear().toString().slice(-2),
      "x",
      "official",
      "_" + Math.floor(Math.random() * 90 + 10).toString(),
    ];
    const candidates = new Set<string>();
    candidates.add(clean);
    suffixes.forEach((s) => candidates.add(`${clean}${s}`));
    return Array.from(candidates)
      .filter((c) => c.length >= 3)
      .slice(0, 5);
  };

  // Live username availability check with debounce
  const usernameValue = form.watch("username");
  useEffect(() => {
    let ignore = false;
    const v = (usernameValue || "").trim();
    if (!v || !usernameSchema.safeParse(v).success) {
      setUsernameStatus("idle");
      setUsernameSuggestions([]);
      return;
    }

    setUsernameStatus("checking");
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/check-username?username=${encodeURIComponent(v)}`,
          {
            signal: controller.signal,
          }
        );
        if (!res.ok) throw new Error("Failed to check username");
        const data = await res.json();
        if (ignore) return;
        if (data.available) {
          setUsernameStatus("available");
          setUsernameSuggestions([]);
          form.clearErrors("username");
        } else {
          setUsernameStatus("unavailable");
          const suggested =
            (Array.isArray(data.suggestions) ? data.suggestions : []) ||
            generateLocalSuggestions(v);
          setUsernameSuggestions(suggested);
          form.setError("username", {
            type: "manual",
            message: "Username is taken",
          });
        }
      } catch {
        if (!ignore) {
          setUsernameStatus("idle");
        }
      }
    }, 350);

    return () => {
      ignore = true;
      controller.abort();
      clearTimeout(t);
    };
  }, [usernameValue, form]);

  const normalizePhoneE164 = (raw: string): string | null => {
    const p = parsePhoneNumberFromString(raw || "");
    return p?.isValid() ? p.number : null; // E.164
  };

  const formatPhoneInternational = (raw: string): string => {
    const p = parsePhoneNumberFromString(raw || "");
    return p?.isValid() ? p.formatInternational() : raw;
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setError(null);

      // Normalize phone to E.164
      const phoneE164 = normalizePhoneE164(values.phoneNumber);
      if (!phoneE164) {
        form.setError("phoneNumber", {
          type: "manual",
          message: "Invalid phone number",
        });
        setIsLoading(false);
        return;
      }

      // Final username availability guard
      if (usernameStatus === "unavailable") {
        form.setError("username", {
          type: "manual",
          message: "Username is taken",
        });
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.username.trim(),
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          phoneNumber: phoneE164,
          password: values.password,
          ageVerification: values.ageVerification,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // If server returns suggestions on conflict, surface them
        if (res.status === 409 && Array.isArray(data?.suggestions)) {
          setUsernameSuggestions(data.suggestions);
          form.setError("username", {
            type: "manual",
            message: data.error || "Username unavailable",
          });
        }
        throw new Error(data.error || "Registration failed");
      }

      const signInResult = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (signInResult?.error) throw new Error(signInResult.error);

      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Registration failed");
        setError(error.message);
      } else {
        toast.error("Registration failed");
        setError("Unknown error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const usernameHelp = useMemo(() => {
    switch (usernameStatus) {
      case "checking":
        return "Checking availability…";
      case "available":
        return "Username is available 🎉";
      case "unavailable":
        return "Username is taken. Try a suggestion below.";
      default:
        return "3–20 chars. Letters, numbers, underscores only.";
    }
  }, [usernameStatus]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="flex flex-col md:flex-row w-full max-w-5xl p-0 overflow-hidden gap-0">
        <div className="w-full md:w-1/2 p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Sign Up</h1>
          <p className="text-gray-600 text-sm mb-6">
            Get started with your Hug Harmony account.
          </p>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              {/* Username */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Username
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="text-sm border-gray-300"
                        placeholder="Choose a unique username (e.g., hugger_123)"
                        autoComplete="username"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500" aria-live="polite">
                      {usernameHelp}
                    </p>
                    {usernameStatus === "unavailable" &&
                      usernameSuggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {usernameSuggestions.map((s) => (
                            <Button
                              key={s}
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                              onClick={() => {
                                form.setValue("username", s, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }}
                            >
                              {s}
                            </Button>
                          ))}
                        </div>
                      )}
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        First Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="text-sm border-gray-300"
                          placeholder="First Name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Last Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="text-sm border-gray-300"
                          placeholder="Last Name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="text-sm border-gray-300"
                          placeholder="Email"
                          type="email"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="text-sm border-gray-300"
                          placeholder="+1 415 555 2671"
                          inputMode="tel"
                          autoComplete="tel"
                          {...field}
                          onBlur={(e) => {
                            field.onBlur();
                            const formatted = formatPhoneInternational(
                              e.target.value
                            );
                            form.setValue("phoneNumber", formatted, {
                              shouldDirty: true,
                            });
                          }}
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500">
                        Use international format (e.g., +14155552671)
                      </p>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Passwords */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="text-sm border-gray-300"
                        placeholder="Password"
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      At least 8 characters, 1 uppercase, 1 number, 1 special
                      character.
                    </p>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="text-sm border-gray-300"
                        placeholder="Confirm Password"
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Terms */}
              <FormField
                control={form.control}
                name="ageVerification"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium">
                        <p>
                          I confirm that I am over 18 years old and agree to the{" "}
                          <Link
                            href="/terms"
                            className="text-blue-600 hover:underline"
                          >
                            Terms and Conditions
                          </Link>
                        </p>
                      </FormLabel>
                      <FormMessage className="text-xs" />
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-[#E7C4BB] text-black text-sm hover:bg-[#d4a8a0] transition-colors cursor-pointer"
                disabled={isLoading || usernameStatus === "checking"}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>

              <div className="text-center text-xs text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-600 hover:underline">
                  Login
                </Link>
              </div>

              <div className="text-center text-xs text-gray-600 mt-4">
                Or sign up with
              </div>

              <Button
                type="button"
                className="bg-white text-black border border-gray-300 w-full text-xs hover:bg-gray-50 flex items-center justify-center space-x-2 cursor-pointer"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                disabled={isLoading}
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.02.68-2.31 1.08-3.71 1.08-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C4.01 20.07 7.74 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.74 1 4.01 3.93 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Google</span>
              </Button>
            </form>
          </Form>
        </div>
        <div className="hidden md:flex w-1/2 relative">
          <Image
            src={register}
            alt="Register background"
            fill
            style={{ objectFit: "cover" }}
          />
        </div>
      </Card>
    </div>
  );
}
