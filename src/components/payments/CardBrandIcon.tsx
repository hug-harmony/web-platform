// src/components/payments/CardBrandIcon.tsx

"use client";

import { CreditCard } from "lucide-react";

interface CardBrandIconProps {
  brand: string | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function CardBrandIcon({
  brand,
  className = "",
  size = "md",
}: CardBrandIconProps) {
  const sizeClasses = {
    sm: "w-6 h-4",
    md: "w-8 h-5",
    lg: "w-10 h-6",
  };

  const iconSize = sizeClasses[size];

  // SVG icons for card brands
  const renderBrandIcon = () => {
    const normalizedBrand = brand?.toLowerCase() || "";

    switch (normalizedBrand) {
      case "visa":
        return (
          <svg
            className={`${iconSize} ${className}`}
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#1A1F71" />
            <path
              d="M19.5 21H17L18.75 11H21.25L19.5 21ZM15.25 11L12.875 17.75L12.625 16.5L12.625 16.5L11.75 12C11.75 12 11.625 11 10.25 11H6.125L6 11.25C6 11.25 7.5 11.5 9.25 12.625L11.5 21H14.125L18 11H15.25ZM35.75 21H38L36 11H34C32.875 11 32.625 11.875 32.625 11.875L28.75 21H31.375L31.875 19.625H35.125L35.75 21ZM32.625 17.5L34 13.75L34.75 17.5H32.625ZM29.25 14.125L29.625 11.75C29.625 11.75 28.25 11.25 26.75 11.25C25.125 11.25 21.5 12 21.5 15.25C21.5 18.25 25.75 18.25 25.75 19.75C25.75 21.25 22 20.875 20.75 19.875L20.375 22.375C20.375 22.375 21.75 23 23.75 23C25.75 23 29.375 21.75 29.375 18.75C29.375 15.625 25 15.5 25 14.25C25 13 28.125 13.25 29.25 14.125Z"
              fill="white"
            />
          </svg>
        );

      case "mastercard":
        return (
          <svg
            className={`${iconSize} ${className}`}
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#F7F7F7" />
            <circle cx="19" cy="16" r="10" fill="#EB001B" />
            <circle cx="29" cy="16" r="10" fill="#F79E1B" />
            <path
              d="M24 8.5C26.3 10.3 27.75 13 27.75 16C27.75 19 26.3 21.7 24 23.5C21.7 21.7 20.25 19 20.25 16C20.25 13 21.7 10.3 24 8.5Z"
              fill="#FF5F00"
            />
          </svg>
        );

      case "amex":
        return (
          <svg
            className={`${iconSize} ${className}`}
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#006FCF" />
            <path
              d="M8 12L10 8H14L16 12L18 8H22L18 16L22 24H18L16 20L14 24H10L8 20L6 24H2L6 16L2 8H6L8 12Z"
              fill="white"
            />
            <path d="M24 8H40V12H28V14H39V18H28V20H40V24H24V8Z" fill="white" />
          </svg>
        );

      case "discover":
        return (
          <svg
            className={`${iconSize} ${className}`}
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#F7F7F7" />
            <path d="M0 16C0 16 16 8 48 16V32H0V16Z" fill="#F47216" />
            <circle cx="30" cy="16" r="6" fill="#F47216" />
            <text
              x="8"
              y="18"
              fill="#231F20"
              fontSize="8"
              fontWeight="bold"
              fontFamily="Arial"
            >
              DISCOVER
            </text>
          </svg>
        );

      case "diners":
        return (
          <svg
            className={`${iconSize} ${className}`}
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#0079BE" />
            <circle cx="24" cy="16" r="10" fill="white" />
            <path
              d="M20 10V22M28 10V22M16 16H32"
              stroke="#0079BE"
              strokeWidth="2"
            />
          </svg>
        );

      case "jcb":
        return (
          <svg
            className={`${iconSize} ${className}`}
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#F7F7F7" />
            <rect x="6" y="6" width="10" height="20" rx="2" fill="#0E4C96" />
            <rect x="19" y="6" width="10" height="20" rx="2" fill="#E41D2D" />
            <rect x="32" y="6" width="10" height="20" rx="2" fill="#007940" />
            <text
              x="8"
              y="18"
              fill="white"
              fontSize="6"
              fontWeight="bold"
              fontFamily="Arial"
            >
              J
            </text>
            <text
              x="21"
              y="18"
              fill="white"
              fontSize="6"
              fontWeight="bold"
              fontFamily="Arial"
            >
              C
            </text>
            <text
              x="34"
              y="18"
              fill="white"
              fontSize="6"
              fontWeight="bold"
              fontFamily="Arial"
            >
              B
            </text>
          </svg>
        );

      case "unionpay":
        return (
          <svg
            className={`${iconSize} ${className}`}
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="48" height="32" rx="4" fill="#F7F7F7" />
            <path d="M8 4H18L14 28H4L8 4Z" fill="#E21836" />
            <path d="M16 4H28L24 28H12L16 4Z" fill="#00447C" />
            <path d="M26 4H38L34 28H22L26 4Z" fill="#007B84" />
          </svg>
        );

      default:
        return (
          <CreditCard className={`${iconSize} text-[#C4C4C4] ${className}`} />
        );
    }
  };

  return renderBrandIcon();
}

// Simple colored icon version for compact displays
export function CardBrandIconSimple({
  brand,
  className = "",
}: {
  brand: string | null | undefined;
  className?: string;
}) {
  const normalizedBrand = brand?.toLowerCase() || "";

  const brandColors: Record<string, string> = {
    visa: "text-[#1A1F71]",
    mastercard: "text-[#EB001B]",
    amex: "text-[#006FCF]",
    discover: "text-[#F47216]",
    diners: "text-[#0079BE]",
    jcb: "text-[#0E4C96]",
    unionpay: "text-[#E21836]",
  };

  const colorClass = brandColors[normalizedBrand] || "text-[#C4C4C4]";

  return <CreditCard className={`w-5 h-5 ${colorClass} ${className}`} />;
}
