// app/register/page.tsx

"use client";

import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import register from "../../../public/register.webp";
import logo from "../../../public/hh-logo.png";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AppleSignInButton } from "@/components/auth/apple-sign-in-button";
import { FacebookSignInButton } from "@/components/auth/facebook-sign-in-button";
import PhoneInput from "react-phone-number-input/react-hook-form";
import "react-phone-number-input/style.css";
import {
  registerSchema,
  usernameSchema,
  hearOptions,
  type RegisterInput,
} from "@/lib/validations/auth";

type UsernameStatus = "idle" | "checking" | "available" | "unavailable";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      ageVerification: false,
      heardFrom: undefined,
      heardFromOther: "",
    },
    mode: "onChange",
  });

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

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/check-username?username=${encodeURIComponent(v)}`,
          { signal: controller.signal }
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
            Array.isArray(data.suggestions) && data.suggestions.length > 0
              ? data.suggestions
              : generateLocalSuggestions(v);
          setUsernameSuggestions(suggested);
          form.setError("username", {
            type: "manual",
            message: "Username is taken",
          });
        }
      } catch {
        if (!ignore) setUsernameStatus("idle");
      }
    }, 350);

    return () => {
      ignore = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [usernameValue, form]);

  const handleSubmit = async (values: RegisterInput) => {
    try {
      setIsLoading(true);
      setError(null);

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
          phoneNumber: values.phoneNumber,
          password: values.password,
          ageVerification: values.ageVerification,
          heardFrom: values.heardFrom,
          heardFromOther: values.heardFromOther?.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && Array.isArray(data?.suggestions)) {
          setUsernameSuggestions(data.suggestions);
          form.setError("username", {
            type: "manual",
            message: data.error || "Username unavailable",
          });
        }
        throw new Error(data.error || "Registration failed");
      }

      toast.success(
        "Account created! Please check your email to verify your account."
      );

      // Redirect to a verification pending page instead of auto-login
      router.push(
        `/verification-pending?email=${encodeURIComponent(values.email)}`
      );
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Registration failed";
      toast.error(msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const usernameHelp = useMemo(() => {
    switch (usernameStatus) {
      case "checking":
        return "Checking availability…";
      case "available":
        return "✓ Username is available";
      case "unavailable":
        return "Username is taken. Try a suggestion below.";
      default:
        return "3–20 chars. Letters, numbers, underscores only.";
    }
  }, [usernameStatus]);

  const heardFrom = form.watch("heardFrom");

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="flex flex-col md:flex-row w-full max-w-5xl p-0 overflow-hidden gap-0">
        <div className="w-full md:w-1/2 p-8">
          <div className="flex justify-start mb-4">
            <Image
              src={logo}
              alt="Hug Harmony Logo"
              width={120}
              height={40}
              className="h-20 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Sign Up</h1>
          <p className="text-gray-600 text-sm mb-6">
            Get started with your Hug Harmony account.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

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
                    <p
                      className={`text-xs ${
                        usernameStatus === "available"
                          ? "text-green-600"
                          : usernameStatus === "unavailable"
                            ? "text-red-600"
                            : "text-gray-500"
                      }`}
                      aria-live="polite"
                    >
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
                        <PhoneInput
                          international
                          countryCallingCodeEditable={false}
                          defaultCountry="US"
                          placeholder="Enter phone number"
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E7C4BB] disabled:opacity-50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* How did you hear about us */}
              <FormField
                control={form.control}
                name="heardFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      How did you hear about Hug Harmony?
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {hearOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {heardFrom === "Other" && (
                <FormField
                  control={form.control}
                  name="heardFromOther"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Please specify
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us how you found us..."
                          className="text-sm resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}

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
                      <div className="relative">
                        <Input
                          className="text-sm border-gray-300 pr-10"
                          placeholder="Password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
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
                      <div className="relative">
                        <Input
                          className="text-sm border-gray-300 pr-10"
                          placeholder="Confirm Password"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          aria-label={
                            showConfirmPassword
                              ? "Hide confirm password"
                              : "Show confirm password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
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

              <div className="flex flex-col gap-3">
                <GoogleSignInButton disabled={isLoading} />
                <AppleSignInButton disabled={isLoading} />
                <FacebookSignInButton disabled={isLoading} />
              </div>
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
