import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { HeaderActionButtons } from "./HeaderActionButtons";

interface Props {
  profile: {
    name?: string | null;
    email: string;
    profileImage?: string | null;
  };
  isProfessional: boolean;
  ownProfile: boolean;
  onboardingStep?: string;
  professionalId?: string | null;
}

export function ProfileHeader({
  profile,
  isProfessional,
  ownProfile,
  onboardingStep,
  professionalId,
}: Props) {
  return (
    <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16 border-2 border-white">
            <AvatarImage
              src={profile.profileImage || "/register.jpg"}
              alt={profile.name ?? ""}
            />
            <AvatarFallback className="bg-[#C4C4C4] text-black">
              {profile.name?.[0] ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">
              {profile.name ?? "User"}
            </h1>
            <p className="text-black text-sm">{profile.email}</p>
            {isProfessional && (
              <span className="mt-1 inline-block bg-black text-[#F3CFC6] text-xs font-medium px-2 py-1 rounded">
                Professional
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <HeaderActionButtons
          ownProfile={ownProfile}
          onboardingStep={onboardingStep}
          professionalId={professionalId}
        />
      </CardContent>
    </Card>
  );
}
