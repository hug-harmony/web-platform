// src/app/dashboard/profile/[id]/ProfileHeader.tsx

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  MapPin,
  MoreVertical,
  StarIcon,
  Book,
  Video,
  MessageSquare,
  Home,
  Shield,
  User,
  Ban,
  Star,
} from "lucide-react";

import type { Profile, ProfessionalProfile } from "@/types/profile";

// Type guard
function isProfessional(profile: Profile): profile is ProfessionalProfile {
  return profile.type === "professional";
}

interface ProfileHeaderProps {
  profile: Profile;
  displayIsOnline: boolean;
  displayOnlineText: string;
  isBlocked: boolean;
  setIsBlockDialogOpen: (open: boolean) => void;
  setIsReportOpen: (open: boolean) => void;
  setIsNoteOpen: (open: boolean) => void;
  handleStartChat: () => Promise<void>;
}

export default function ProfileHeader({
  profile,
  displayIsOnline,
  displayOnlineText,
  isBlocked,
  setIsBlockDialogOpen,
  setIsReportOpen,
  setIsNoteOpen,
  handleStartChat,
}: ProfileHeaderProps) {
  const isPro = isProfessional(profile);
  const validImageSrc = profile.image || "/register.jpg";

  return (
    <Card className="shadow-lg pt-0 overflow-hidden">
      {/* Hero Section */}
      <div className="relative h-64 sm:h-80">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${validImageSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(8px)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F3CFC6]/30 to-[#C4C4C4]/30" />
        <div className="relative flex justify-center items-center h-full">
          <div className="relative">
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-md">
              {profile.image ? (
                <Image
                  src={validImageSrc}
                  alt={profile.name}
                  width={160}
                  height={160}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#C4C4C4]">
                  <span className="text-4xl text-black">
                    {profile.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            {/* Online indicator on avatar */}
            <div
              className={cn(
                "absolute bottom-2 right-2 w-5 h-5 rounded-full border-2 border-white",
                displayIsOnline ? "bg-green-500" : "bg-gray-400"
              )}
              title={displayOnlineText}
            />
          </div>
        </div>
      </div>

      <CardContent className="pt-6 text-center">
        <div className="space-y-4">
          {/* Name and Badge */}
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">
              {profile.name}
            </h2>
            {isPro ? (
              <Badge className="bg-[#F3CFC6] text-black hover:bg-[#fff]/80">
                <Shield className="w-3 h-3 mr-1" />
                Professional
              </Badge>
            ) : (
              <Badge variant="secondary">
                <User className="w-3 h-3 mr-1" />
                Member
              </Badge>
            )}
          </div>

          {/* Meta Info */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-[#C4C4C4] flex-wrap">
            {profile.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#F3CFC6]" />
                <span>{profile.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full transition-colors duration-300",
                  displayIsOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
                )}
              />
              <span
                className={cn(
                  "transition-colors duration-300",
                  displayIsOnline ? "text-green-600 font-medium" : ""
                )}
              >
                {displayOnlineText}
              </span>
            </div>
            {isPro && profile.rating !== undefined && (
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-[#F3CFC6]" />
                <span>
                  {profile.rating.toFixed(1)} ({profile.reviewCount || 0}{" "}
                  reviews)
                </span>
              </div>
            )}
            {isPro && profile.venue && (
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-[#F3CFC6]" />
                <span>
                  {profile.venue.charAt(0).toUpperCase() +
                    profile.venue.slice(1)}
                </span>
              </div>
            )}
          </div>

          {/* Rate (Professional only) */}
          {isPro && profile.rate !== undefined && (
            <p className="text-lg font-semibold text-black dark:text-white">
              ${profile.rate}/session
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
            {/* Booking buttons (Professional only) */}
            {isPro && (
              <>
                <Button
                  asChild
                  className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full w-full sm:w-auto"
                >
                  <Link href={`/dashboard/appointments/book/${profile.id}`}>
                    <Book className="mr-2 h-4 w-4" /> Book In-Person
                  </Link>
                </Button>
                <Button
                  asChild
                  className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full w-full sm:w-auto"
                >
                  <Link
                    href={`/dashboard/appointments/book/${profile.id}?type=video`}
                  >
                    <Video className="mr-2 h-4 w-4" /> Book Virtual
                  </Link>
                </Button>
              </>
            )}

            {/* Chat button (always shown) */}
            <Button
              onClick={handleStartChat}
              className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full w-full sm:w-auto"
            >
              <MessageSquare className="mr-2 h-4 w-4" /> Start Chat
            </Button>

            {/* Favorites button */}
            <Button className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white px-6 py-2 rounded-full w-full sm:w-auto">
              <StarIcon className="mr-2 h-4 w-4" /> Save to Favourites
            </Button>

            {/* More options dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#fff]/80 px-6 py-2 rounded-full w-full sm:w-auto"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onSelect={() => setIsBlockDialogOpen(true)}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {isBlocked ? "Unblock" : "Block"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsReportOpen(true)}>
                  Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsNoteOpen(true)}>
                  Make a Note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
