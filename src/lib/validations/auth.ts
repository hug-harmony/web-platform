// lib/validations/auth.ts

import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

// Username validation
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Only letters, numbers, and underscores are allowed"
  );

// Password validation
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/\d/, "Must contain at least one number")
  .regex(
    /[!@#$%^&*(),.?":{}|<>_\-\[\];'`~+/=\\]/,
    "Must contain at least one special character"
  );

// Phone validation (international format)
export const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine((val) => /^\+[1-9]\d{6,14}$/.test(val.trim()), {
    message: "Phone number must be in international format (e.g., +1234567890)",
  })
  .refine((val) => isValidPhoneNumber(val.trim()), {
    message: "Invalid phone number",
  });

// Email validation
export const emailSchema = z.string().email("Invalid email address");

// How did you hear about us options
export const hearOptions = [
  "Social Media (e.g., Facebook, Instagram, X)",
  "Search Engine (e.g., Google)",
  "Friend or Family Referral",
  "Online Advertisement",
  "Podcast or Radio",
  "Email Newsletter",
  "Event or Workshop",
  "Professional Network (e.g., LinkedIn)",
  "TV commercial",
  "Other",
] as const;

export type HearOption = (typeof hearOptions)[number];

// Registration schema (client-side with confirmPassword)
export const registerSchema = z
  .object({
    username: usernameSchema,
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: emailSchema,
    phoneNumber: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
    ageVerification: z.boolean(),
    heardFrom: z.enum(hearOptions, {
      message: "Select how you heard about us",
    }),
    heardFromOther: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.ageVerification === true, {
    message: "You must confirm you are over 18 and agree to the terms",
    path: ["ageVerification"],
  })
  .refine(
    (data) =>
      data.heardFrom !== "Other" ||
      (data.heardFromOther?.trim().length ?? 0) > 0,
    {
      message: "Please specify how you heard about us",
      path: ["heardFromOther"],
    }
  );

// API registration schema (server-side)
export const registerApiSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: phoneSchema,
  ageVerification: z.boolean(),
  heardFrom: z.enum(hearOptions),
  heardFromOther: z.string().optional(),
});

// Login schema (email or username)
/*
export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Email or username is required")
    .refine(
      (val) => {
        const v = val.trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        const isUsername = /^[a-zA-Z0-9_]{3,20}$/.test(v);
        return isEmail || isUsername;
      },
      { message: "Enter a valid email or username (3–20 chars)" }
    ),
  password: z.string().min(1, "Password is required"),
});
*/

// Login schema (email only)
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Resend verification schema
export const resendVerificationSchema = z.object({
  email: emailSchema,
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: emailSchema.optional(),
  phone: z.string().optional(),
});

// Password reset schema
export const passwordResetSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Reserved usernames
export const RESERVED_USERNAMES = new Set([
  "admin",
  "support",
  "root",
  "hugharmony",
  "hug",
  "me",
  "null",
  "undefined",
  "api",
  "www",
  "mail",
  "help",
  "info",
  "contact",
  "team",
  "staff",
  "moderator",
  "mod",
  "system",
  "bot",
]);

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterApiInput = z.infer<typeof registerApiSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
