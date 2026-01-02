// src/components/payments/PaymentAcceptanceIcons.tsx

"use client";

import { PaymentAcceptanceMethod } from "@/lib/constants/payment-acceptance-methods";
import { Banknote, CreditCard, Smartphone, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentAcceptanceIconProps {
  method: PaymentAcceptanceMethod;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-5",
  md: "w-10 h-6",
  lg: "w-12 h-8",
};

const iconSizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const METHOD_LABELS: Record<PaymentAcceptanceMethod, string> = {
  cash: "Cash",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  zelle: "Zelle",
  venmo: "Venmo",
  paypal: "PayPal",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  cashapp: "Cash App",
  check: "Check",
};

export function PaymentAcceptanceIcon({
  method,
  size = "md",
  showLabel = false,
  className = "",
}: PaymentAcceptanceIconProps) {
  const containerClass = cn(
    sizeClasses[size],
    "flex items-center justify-center",
    className
  );

  const renderIcon = () => {
    switch (method) {
      case "cash":
        return (
          <div
            className={cn(
              containerClass,
              "bg-green-100 dark:bg-green-900/30 rounded"
            )}
          >
            <Banknote
              className={cn(
                iconSizeClasses[size],
                "text-green-600 dark:text-green-400"
              )}
            />
          </div>
        );

      case "credit_card":
        return (
          <svg
            className={containerClass}
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#F7F7F7" />
            <rect x="4" y="8" width="12" height="8" rx="1" fill="#1A1F71" />
            <rect x="4" y="20" width="20" height="2" rx="1" fill="#1A1F71" />
            <rect x="4" y="24" width="12" height="2" rx="1" fill="#C4C4C4" />
            <circle cx="36" cy="16" r="6" fill="#EB001B" />
            <circle cx="42" cy="16" r="6" fill="#F79E1B" fillOpacity="0.8" />
          </svg>
        );

      case "debit_card":
        return (
          <div
            className={cn(
              containerClass,
              "bg-blue-100 dark:bg-blue-900/30 rounded"
            )}
          >
            <CreditCard
              className={cn(
                iconSizeClasses[size],
                "text-blue-600 dark:text-blue-400"
              )}
            />
          </div>
        );

      case "zelle":
        return (
          <svg
            className={containerClass}
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#6D1ED4" />
            <path
              d="M14 10H34L20 22H34"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case "venmo":
        return (
          <svg
            className={containerClass}
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#3D95CE" />
            <path
              d="M15 8C16.5 11 17 14 17 18L13 26H21L27 8H19L17 18C16 14 15.5 11 14 8H15Z"
              fill="white"
            />
          </svg>
        );

      case "paypal":
        return (
          <svg
            className={containerClass}
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#F7F7F7" />
            <path
              d="M18 24L20 10H28C32 10 34 12 33 16C32 20 28 22 24 22H22L21 26H18V24Z"
              fill="#003087"
            />
            <path
              d="M15 28L17 14H25C29 14 31 16 30 20C29 24 25 26 21 26H19L18 30H15V28Z"
              fill="#009CDE"
            />
          </svg>
        );

      case "apple_pay":
        return (
          <svg
            className={containerClass}
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#000000" />
            <path
              d="M14 11C14.5 10 15.5 9 17 9C17.8 9 18.5 9.3 19 9.8C19.5 9.3 20.2 9 21 9C22.5 9 23.5 10 24 11C24 13.5 21 16.5 19 18.5C17 16.5 14 13.5 14 11Z"
              fill="white"
            />
            <text
              x="26"
              y="20"
              fill="white"
              fontSize="9"
              fontWeight="600"
              fontFamily="system-ui"
            >
              Pay
            </text>
          </svg>
        );

      case "google_pay":
        return (
          <svg
            className={containerClass}
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#F7F7F7" />
            <path
              d="M16 16C16 13.8 17.8 12 20 12C21.1 12 22 12.4 22.7 13L21.3 14.4C20.9 14 20.5 13.8 20 13.8C18.8 13.8 17.8 14.8 17.8 16C17.8 17.2 18.8 18.2 20 18.2C21.1 18.2 21.8 17.6 22 16.8H20V15.2H23.8C23.9 15.5 23.9 15.8 23.9 16.2C23.9 18.5 22.2 20 20 20C17.8 20 16 18.2 16 16Z"
              fill="#4285F4"
            />
            <text
              x="26"
              y="19"
              fill="#5F6368"
              fontSize="8"
              fontWeight="500"
              fontFamily="system-ui"
            >
              Pay
            </text>
          </svg>
        );

      case "cashapp":
        return (
          <svg
            className={containerClass}
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#00D632" />
            <path d="M24 7L26 11H22L24 7Z" fill="white" />
            <rect x="22" y="11" width="4" height="10" rx="2" fill="white" />
            <path d="M24 25L22 21H26L24 25Z" fill="white" />
            <path
              d="M18 13C18 11.5 20 10 24 10C28 10 30 11.5 30 13"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M18 19C18 20.5 20 22 24 22C28 22 30 20.5 30 19"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        );

      case "check":
        return (
          <div
            className={cn(
              containerClass,
              "bg-gray-100 dark:bg-gray-800 rounded"
            )}
          >
            <FileCheck
              className={cn(
                iconSizeClasses[size],
                "text-gray-600 dark:text-gray-400"
              )}
            />
          </div>
        );

      default:
        return (
          <div
            className={cn(
              containerClass,
              "bg-gray-100 dark:bg-gray-800 rounded"
            )}
          >
            <Smartphone
              className={cn(
                iconSizeClasses[size],
                "text-gray-600 dark:text-gray-400"
              )}
            />
          </div>
        );
    }
  };

  if (showLabel) {
    return (
      <div className="flex flex-col items-center gap-1">
        {renderIcon()}
        <span className="text-xs text-[#C4C4C4]">{METHOD_LABELS[method]}</span>
      </div>
    );
  }

  return renderIcon();
}

// Component to display multiple payment method icons
interface PaymentAcceptanceIconsProps {
  methods: string[];
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  maxDisplay?: number;
  className?: string;
}

export function PaymentAcceptanceIcons({
  methods,
  size = "md",
  showLabels = false,
  maxDisplay,
  className = "",
}: PaymentAcceptanceIconsProps) {
  const displayMethods = maxDisplay ? methods.slice(0, maxDisplay) : methods;
  const remainingCount = maxDisplay
    ? Math.max(0, methods.length - maxDisplay)
    : 0;

  if (methods.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {displayMethods.map((method) => (
        <PaymentAcceptanceIcon
          key={method}
          method={method as PaymentAcceptanceMethod}
          size={size}
          showLabel={showLabels}
        />
      ))}
      {remainingCount > 0 && (
        <span className="text-sm text-[#C4C4C4]">+{remainingCount} more</span>
      )}
    </div>
  );
}
