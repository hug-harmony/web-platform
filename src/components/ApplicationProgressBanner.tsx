// components/ApplicationProgressBanner.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useUserProfile } from "@/hooks/useUserProfile";
import { X, ArrowRight } from "lucide-react";
import {
  BANNER_CONFIG,
  isApplicationInProgress,
} from "@/lib/constants/application-status";

const variantStyles = {
  default: {
    container: "bg-gradient-to-r from-[#F3CFC6] to-[#f8e1dc] border-[#F3CFC6]",
    text: "text-black",
    badge: "bg-black/10 text-black",
    icon: "bg-black text-[#F3CFC6]",
    button: "bg-black hover:bg-gray-800 text-white",
  },
  warning: {
    container: "bg-gradient-to-r from-amber-100 to-amber-50 border-amber-300",
    text: "text-amber-900",
    badge: "bg-amber-200 text-amber-800",
    icon: "bg-amber-500 text-white",
    button: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  success: {
    container: "bg-gradient-to-r from-green-100 to-emerald-50 border-green-300",
    text: "text-green-900",
    badge: "bg-green-200 text-green-800",
    icon: "bg-green-500 text-white",
    button: "bg-green-600 hover:bg-green-700 text-white",
  },
  error: {
    container: "bg-gradient-to-r from-red-100 to-red-50 border-red-300",
    text: "text-red-900",
    badge: "bg-red-200 text-red-800",
    icon: "bg-red-500 text-white",
    button: "bg-red-600 hover:bg-red-700 text-white",
  },
};

export default function ApplicationProgressBanner() {
  const { isProfessional, applicationStatus, isLoading } = useUserProfile();
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const dismissed = sessionStorage.getItem("app-banner-dismissed");
    if (dismissed) setIsDismissed(true);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("app-banner-dismissed", "true");
  };

  if (!hasMounted) return null;
  if (isLoading) return null;
  if (isProfessional) return null;
  if (isDismissed) return null;
  if (!applicationStatus || !isApplicationInProgress(applicationStatus))
    return null;

  const config = BANNER_CONFIG[applicationStatus];
  if (!config) return null;

  const styles = variantStyles[config.variant];
  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={`border-b shadow-sm ${styles.container}`}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div
                className={`hidden sm:flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full ${styles.icon}`}
              >
                <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className={`text-sm sm:text-base font-semibold ${styles.text}`}
                  >
                    {config.label}
                  </p>
                  <span
                    className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap ${styles.badge}`}
                  >
                    {config.shortLabel}
                  </span>
                </div>
                <p
                  className={`text-xs sm:text-sm opacity-80 hidden md:block truncate ${styles.text}`}
                >
                  {config.description}
                </p>

                {config.progress > 0 && config.progress < 100 && (
                  <div className="mt-1.5 hidden lg:block max-w-xs">
                    <Progress value={config.progress} className="h-1" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Button
                asChild
                size="sm"
                className={`rounded-full h-7 sm:h-8 px-3 sm:px-4 text-xs sm:text-sm ${styles.button}`}
              >
                <Link href={config.href}>
                  <span className="hidden sm:inline">{config.buttonText}</span>
                  <span className="sm:hidden">Continue</span>
                  <ArrowRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                </Link>
              </Button>

              {config.variant !== "error" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-8 sm:w-8 rounded-full opacity-60 hover:opacity-100"
                  onClick={handleDismiss}
                  aria-label="Dismiss banner"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
