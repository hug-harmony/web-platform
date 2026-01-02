// src/lib/constants/payment-acceptance-methods.ts

import {
  Banknote,
  CreditCard,
  Smartphone,
  FileCheck,
  Building2,
} from "lucide-react";

export type PaymentAcceptanceMethod =
  | "cash"
  | "credit_card"
  | "debit_card"
  | "zelle"
  | "venmo"
  | "paypal"
  | "apple_pay"
  | "google_pay"
  | "cashapp"
  | "check";

export type PaymentMethodCategory = "cash" | "card" | "digital" | "other";

export interface PaymentMethodInfo {
  id: PaymentAcceptanceMethod;
  name: string;
  description: string;
  category: PaymentMethodCategory;
  icon: React.ComponentType<{ className?: string }>;
}

export const PAYMENT_ACCEPTANCE_METHODS: PaymentMethodInfo[] = [
  {
    id: "cash",
    name: "Cash",
    description: "Cash payments",
    category: "cash",
    icon: Banknote,
  },
  {
    id: "credit_card",
    name: "Credit Card",
    description: "Visa, Mastercard, Amex, Discover",
    category: "card",
    icon: CreditCard,
  },
  {
    id: "debit_card",
    name: "Debit Card",
    description: "Bank debit cards",
    category: "card",
    icon: CreditCard,
  },
  {
    id: "zelle",
    name: "Zelle",
    description: "Bank-to-bank transfers",
    category: "digital",
    icon: Building2,
  },
  {
    id: "venmo",
    name: "Venmo",
    description: "Venmo payments",
    category: "digital",
    icon: Smartphone,
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "PayPal payments",
    category: "digital",
    icon: Smartphone,
  },
  {
    id: "apple_pay",
    name: "Apple Pay",
    description: "Apple Pay",
    category: "digital",
    icon: Smartphone,
  },
  {
    id: "google_pay",
    name: "Google Pay",
    description: "Google Pay",
    category: "digital",
    icon: Smartphone,
  },
  {
    id: "cashapp",
    name: "Cash App",
    description: "Cash App payments",
    category: "digital",
    icon: Smartphone,
  },
  {
    id: "check",
    name: "Check",
    description: "Personal or certified checks",
    category: "other",
    icon: FileCheck,
  },
];

export const CATEGORY_LABELS: Record<PaymentMethodCategory, string> = {
  cash: "Cash",
  card: "Cards",
  digital: "Digital Wallets",
  other: "Other",
};

export const CATEGORY_ORDER: PaymentMethodCategory[] = [
  "cash",
  "card",
  "digital",
  "other",
];

export function getPaymentMethodInfo(
  id: string
): PaymentMethodInfo | undefined {
  return PAYMENT_ACCEPTANCE_METHODS.find((method) => method.id === id);
}

export function getPaymentMethodsByCategory(
  category: PaymentMethodCategory
): PaymentMethodInfo[] {
  return PAYMENT_ACCEPTANCE_METHODS.filter(
    (method) => method.category === category
  );
}

export function groupPaymentMethodsByCategory(): Record<
  PaymentMethodCategory,
  PaymentMethodInfo[]
> {
  return PAYMENT_ACCEPTANCE_METHODS.reduce(
    (acc, method) => {
      if (!acc[method.category]) {
        acc[method.category] = [];
      }
      acc[method.category].push(method);
      return acc;
    },
    {} as Record<PaymentMethodCategory, PaymentMethodInfo[]>
  );
}
