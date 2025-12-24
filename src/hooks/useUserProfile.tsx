// hooks/useUserProfile.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  ReactNode,
  useCallback,
} from "react";
import { useSession } from "next-auth/react";

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  firstName?: string | null;
  lastName?: string | null;
}

interface UserContextType {
  user: Profile;
  isProfessional: boolean;
  applicationStatus: "none" | "pending" | "rejected" | "APPROVED";
  unreadNotifications: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Partial<Profile> | null>(null);
  const [isProfessional, setIsProfessional] = useState(false);
  const [applicationStatus, setApplicationStatus] =
    useState<UserContextType["applicationStatus"]>("none");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);

      const [profileRes, professionalRes, notificationsRes] = await Promise.all(
        [
          fetch(`/api/users/${session.user.id}`, {
            cache: "no-store",
            credentials: "include",
          }),
          // ✅ FIX: Correct endpoint with query parameter
          fetch("/api/professionals/application?me=true", {
            cache: "no-store",
            credentials: "include",
          }),
          fetch("/api/notifications/unread-count", {
            cache: "no-store",
            credentials: "include",
          }),
        ]
      );

      // Handle profile response
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile({
          id: data.id,
          name:
            data.firstName && data.lastName
              ? `${data.firstName} ${data.lastName}`
              : data.name,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          avatar: data.profileImage,
        });
      }

      // ✅ FIX: Handle professional status response correctly
      if (professionalRes.ok) {
        const data = await professionalRes.json();
        console.log("Professional status response:", data); // Debug log - remove later

        // The API returns { status, professionalId, application }
        const appStatus = data.status;

        // Check if user is approved professional
        const isApproved = appStatus === "APPROVED";
        setIsProfessional(isApproved);

        // Map status for sidebar display
        if (!appStatus || appStatus === "none") {
          setApplicationStatus("none");
        } else if (appStatus === "APPROVED") {
          setApplicationStatus("APPROVED");
        } else if (appStatus === "REJECTED") {
          setApplicationStatus("rejected");
        } else {
          // VIDEO_PENDING, QUIZ_PENDING, QUIZ_FAILED, ADMIN_REVIEW, FORM_PENDING, etc.
          setApplicationStatus("pending");
        }
      } else {
        // Log error for debugging
        console.error(
          "Failed to fetch professional status:",
          professionalRes.status
        );
        // Reset to safe defaults
        setIsProfessional(false);
        setApplicationStatus("none");
      }

      // Handle notifications response
      if (notificationsRes.ok) {
        const { count } = await notificationsRes.json();
        setUnreadNotifications(count);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      // Reset to safe defaults on error
      setIsProfessional(false);
      setApplicationStatus("none");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUserData();
    } else if (status === "unauthenticated") {
      // Reset state when logged out
      setProfile(null);
      setIsProfessional(false);
      setApplicationStatus("none");
      setUnreadNotifications(0);
      setIsLoading(false);
    }
  }, [status, fetchUserData]);

  const user = useMemo<Profile>(
    () => ({
      id: session?.user?.id || "default-id",
      name: profile?.name || session?.user?.name || "User",
      email: profile?.email || session?.user?.email || "user@example.com",
      avatar:
        profile?.avatar ||
        session?.user?.image ||
        "/assets/images/avatar-placeholder.png",
      firstName: profile?.firstName,
      lastName: profile?.lastName,
    }),
    [profile, session]
  );

  const contextValue = useMemo<UserContextType>(
    () => ({
      user,
      isProfessional,
      applicationStatus,
      unreadNotifications,
      isLoading,
      refetch: fetchUserData,
    }),
    [
      user,
      isProfessional,
      applicationStatus,
      unreadNotifications,
      isLoading,
      fetchUserData,
    ]
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserProfile must be used within UserProvider");
  }
  return context;
}
