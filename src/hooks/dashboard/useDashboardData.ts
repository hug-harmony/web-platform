// src/hooks/dashboard/useDashboardData.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { toast } from "sonner";
import type {
  DashboardUser,
  Conversation,
  Appointment,
  DashboardData,
} from "@/types/dashboard";

export function useDashboardData(): DashboardData & {
  refetch: () => Promise<void>;
} {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: session, status } = useSession();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    const id = session?.user?.id;
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      console.error("Invalid user ID format:", id);
      notFound();
    }

    setLoading(true);
    setError(null);

    try {
      const [userRes, convRes, apptRes] = await Promise.all([
        fetch(`/api/users/${id}`, {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/conversations", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/appointment", {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      // Handle user response
      if (!userRes.ok) {
        if (userRes.status === 401) {
          router.push("/login");
          return;
        }
        if (userRes.status === 404) notFound();
        throw new Error(`Failed to fetch user: ${userRes.status}`);
      }

      const userData = await userRes.json();
      setUser({
        id: userData.id,
        name: userData.name || "User",
        email: userData.email || "",
        profileImage: userData.profileImage || "",
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        heardFrom: userData.heardFrom,
        heardFromOther: userData.heardFromOther,
      });

      // Handle conversations
      if (convRes.ok) {
        const convData = await convRes.json();
        setConversations(Array.isArray(convData) ? convData : []);
      } else if (convRes.status === 401) {
        router.push("/login");
        return;
      } else {
        console.error("Conversations API error:", convRes.status);
        setConversations([]);
      }

      // Handle appointments
      if (apptRes.ok) {
        const apptData = await apptRes.json();
        setAppointments(Array.isArray(apptData) ? apptData : []);
      } else if (apptRes.status === 401) {
        router.push("/login");
        return;
      } else {
        console.error("Appointments API error:", apptRes.status);
        setAppointments([]);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setError("Failed to load data. Please try again.");
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [status, session, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    user,
    conversations,
    appointments,
    loading: status === "loading" || loading,
    error,
    refetch: fetchData,
  };
}
