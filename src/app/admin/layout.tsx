// src/app/admin/layout.tsx (unchanged from previous)
"use client";

import { motion } from "framer-motion";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  //   const { data: session, status } = useSession();
  //   const router = useRouter();

  //   if (status === "loading") {
  //     return <div className="p-4">Loading...</div>;
  //   }

  //   if (status === "unauthenticated" || session?.user?.role !== "admin") {
  //     router.push("/admin/login");
  //     return null;
  //   }

  return (
    <motion.div
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
