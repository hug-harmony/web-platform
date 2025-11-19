import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { notFound } from "next/navigation";
import { Profile, OnboardingStatus } from "@/types/edit-profile";

export function useProfile(id: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [isProfessional, setIsProfessional] = useState(false);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) notFound();

    (async () => {
      try {
        const userRes = await fetch(`/api/users/${id}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!userRes.ok) {
          if (userRes.status === 401) router.push("/login");
          if (userRes.status === 404) notFound();
          throw new Error("User not found");
        }
        const user = await userRes.json();

        const baseProfile: Profile = {
          id: user.id,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          profileImage: user.profileImage,
          location: user.location,
          biography: user.biography,
          email: user.email,
          type: "user",
          relationshipStatus: user.relationshipStatus,
          orientation: user.orientation,
          height: user.height,
          ethnicity: user.ethnicity,
          zodiacSign: user.zodiacSign,
          favoriteColor: user.favoriteColor,
          favoriteMedia: user.favoriteMedia,
          petOwnership: user.petOwnership,
          venue: null,
        };

        setProfile(baseProfile);

        if (session?.user?.id === id) {
          const statusRes = await fetch(
            "/api/professionals/onboarding/status",
            {
              credentials: "include",
            }
          );
          if (statusRes.ok) {
            const data = await statusRes.json();
            setOnboarding(data);

            if (data.step === "APPROVED" && data.application?.professionalId) {
              const specRes = await fetch(
                `/api/professionals/${data.application.professionalId}`,
                {
                  credentials: "include",
                }
              );
              if (specRes.ok) {
                const spec = await specRes.json();
                setIsProfessional(true);
                setProfessionalId(spec.id);
                setProfile((p) =>
                  p
                    ? {
                        ...p,
                        type: "professional",
                        biography: spec.biography,
                        rate: spec.rate,
                        venue: spec.venue,
                      }
                    : p
                );
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, session?.user?.id, router]);

  return {
    profile,
    setProfile,
    onboarding,
    isProfessional,
    professionalId,
    loading,
  };
}
