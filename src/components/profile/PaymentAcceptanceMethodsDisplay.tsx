// src/components/profile/PaymentAcceptanceMethodsDisplay.tsx

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { PaymentAcceptanceIcon } from "@/components/payments/PaymentAcceptanceIcons";
import {
  PAYMENT_ACCEPTANCE_METHODS,
  PaymentAcceptanceMethod,
} from "@/lib/constants/payment-acceptance-methods";
import { motion } from "framer-motion";

interface PaymentAcceptanceMethodsDisplayProps {
  methods: string[];
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function PaymentAcceptanceMethodsDisplay({
  methods,
}: PaymentAcceptanceMethodsDisplayProps) {
  if (!methods || methods.length === 0) {
    return null;
  }

  // Get method info for each selected method
  const selectedMethodsInfo = methods
    .map((id) => PAYMENT_ACCEPTANCE_METHODS.find((m) => m.id === id))
    .filter(Boolean);

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#F3CFC6]" />
            Accepted Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {selectedMethodsInfo.map((method) => {
              if (!method) return null;

              return (
                <div
                  key={method.id}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <PaymentAcceptanceIcon
                    method={method.id as PaymentAcceptanceMethod}
                    size="sm"
                  />
                  <span className="text-sm font-medium text-black dark:text-white">
                    {method.name}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-[#C4C4C4] mt-3">
            This professional accepts the above payment methods for their
            services.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
