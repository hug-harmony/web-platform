// src/components/chat/ProfilePreviewDialog.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  User,
  MessageSquare,
  Video,
  MapPin,
  Calendar,
  ExternalLink,
  Shield,
  Star,
  X,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLastOnline } from "@/lib/formatLastOnline";

export interface ProfileUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImage?: string | null;
  avatar?: string | null;
  email?: string | null;
  location?: string | null;
  biography?: string | null;
  bio?: string | null;
  isProfessional?: boolean;
  isVerified?: boolean;
  professionalId?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  specializations?: string[];
  lastOnline?: Date | string | null;
  createdAt?: Date | string | null;
}

interface ProfilePreviewDialogProps {
  user: ProfileUser | null;
  isOpen: boolean;
  onClose: () => void;
  isOnline?: boolean;
  onMessageClick?: () => void;
  onVideoCallClick?: () => void;
  currentUserId?: string;
}

const ProfilePreviewDialog: React.FC<ProfilePreviewDialogProps> = ({
  user,
  isOpen,
  onClose,
  isOnline = false,
  onMessageClick,
  onVideoCallClick,
  currentUserId,
}) => {
  const [imageExpanded, setImageExpanded] = React.useState(false);

  if (!user) return null;

  const fullName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown User";

  const initials = fullName
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profileImage = user.profileImage || user.avatar;
  const biography = user.biography || user.bio;
  const profileHref = `/dashboard/profile/${user.id}`;

  const { text: lastOnlineText, isOnline: wasRecentlyOnline } =
    formatLastOnline(user.lastOnline ? new Date(user.lastOnline) : null);

  const displayIsOnline = isOnline || wasRecentlyOnline;

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  const isOwnProfile = currentUserId === user.id;

  return (
    <>
      {/* Main Profile Preview Dialog */}
      <Dialog open={isOpen && !imageExpanded} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-gray-900 gap-0">
          <VisuallyHidden>
            <DialogTitle>Profile Preview - {fullName}</DialogTitle>
          </VisuallyHidden>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Header with gradient background */}
          <div className="relative h-20 bg-gradient-to-br from-[#F3CFC6] via-[#F3CFC6]/80 to-[#C4C4C4]">
            {/* Decorative circles */}
            <div className="absolute top-2 right-8 w-16 h-16 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 left-4 w-12 h-12 rounded-full bg-white/10" />
          </div>

          {/* Content */}
          <div className="relative px-6 pb-6">
            {/* Avatar - positioned to overlap header */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2">
              <motion.button
                type="button"
                onClick={() => profileImage && setImageExpanded(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative focus:outline-none focus:ring-2 focus:ring-[#F3CFC6] focus:ring-offset-2 rounded-full",
                  profileImage && "cursor-pointer"
                )}
                disabled={!profileImage}
              >
                <Avatar className="h-20 w-20 border-4 border-white dark:border-gray-900 shadow-lg">
                  <AvatarImage src={profileImage || undefined} alt={fullName} />
                  <AvatarFallback className="text-xl bg-gradient-to-br from-[#F3CFC6] to-[#C4C4C4] text-white font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Online status indicator */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className={cn(
                    "absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full border-[3px] border-white dark:border-gray-900",
                    displayIsOnline ? "bg-green-500" : "bg-gray-400"
                  )}
                />

                {/* Verified badge */}
                {user.isVerified && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="absolute -top-0.5 -right-0.5 bg-blue-500 rounded-full p-1 shadow-sm"
                  >
                    <Shield className="h-3 w-3 text-white" />
                  </motion.div>
                )}

                {/* Click to expand hint */}
                {profileImage && (
                  <div className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <span className="text-white text-xs font-medium drop-shadow-lg">
                      View
                    </span>
                  </div>
                )}
              </motion.button>
            </div>

            {/* User info */}
            <div className="pt-12 text-center">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {fullName}
                  </h2>
                  {user.isProfessional && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-[#F3CFC6]/20 text-[#d4a69b] border-[#F3CFC6]/30"
                    >
                      <Briefcase className="h-3 w-3 mr-1" />
                      Professional
                    </Badge>
                  )}
                </div>

                <p
                  className={cn(
                    "text-sm mt-1 flex items-center justify-center gap-1",
                    displayIsOnline
                      ? "text-green-600 font-medium"
                      : "text-gray-500"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      displayIsOnline
                        ? "bg-green-500 animate-pulse"
                        : "bg-gray-400"
                    )}
                  />
                  {displayIsOnline ? "Online now" : lastOnlineText}
                </p>
              </motion.div>

              {/* Rating for professionals */}
              {user.isProfessional && user.rating != null && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center justify-center gap-1 mt-2"
                >
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-4 w-4",
                          star <= Math.round(user.rating!)
                            ? "text-yellow-500 fill-current"
                            : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white ml-1">
                    {user.rating.toFixed(1)}
                  </span>
                  {user.reviewCount != null && (
                    <span className="text-gray-500 text-sm">
                      ({user.reviewCount}{" "}
                      {user.reviewCount === 1 ? "review" : "reviews"})
                    </span>
                  )}
                </motion.div>
              )}

              {/* Bio */}
              {biography && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-3 text-center"
                >
                  {biography}
                </motion.p>
              )}

              {/* Specializations */}
              {user.specializations && user.specializations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap justify-center gap-1.5 mt-3"
                >
                  {user.specializations.slice(0, 3).map((spec, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs bg-gray-100 dark:bg-gray-800"
                    >
                      {spec}
                    </Badge>
                  ))}
                  {user.specializations.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{user.specializations.length - 3} more
                    </Badge>
                  )}
                </motion.div>
              )}
            </div>

            <Separator className="my-4" />

            {/* Quick info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-2"
            >
              {user.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{user.location}</span>
                </div>
              )}

              {memberSince && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>Member since {memberSince}</span>
                </div>
              )}
            </motion.div>

            <Separator className="my-4" />

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              {/* Primary action - View Profile */}
              <Button
                asChild
                className="w-full bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-900 font-medium"
              >
                <Link href={profileHref} onClick={onClose}>
                  <User className="mr-2 h-4 w-4" />
                  View Full Profile
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Link>
              </Button>

              {/* Secondary actions - only show if not own profile */}
              {!isOwnProfile && (
                <div className="grid grid-cols-2 gap-2">
                  {onMessageClick && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        onMessageClick();
                        onClose();
                      }}
                      className="flex-1"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Message
                    </Button>
                  )}

                  {onVideoCallClick && user.isProfessional && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        onVideoCallClick();
                        onClose();
                      }}
                      disabled={!displayIsOnline}
                      className={cn(
                        "flex-1",
                        !displayIsOnline && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Video className="mr-2 h-4 w-4" />
                      {displayIsOnline ? "Video Call" : "Offline"}
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expanded Image Dialog */}
      <Dialog open={imageExpanded} onOpenChange={setImageExpanded}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-black/95 border-none">
          <VisuallyHidden>
            <DialogTitle>Profile Photo - {fullName}</DialogTitle>
          </VisuallyHidden>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setImageExpanded(false)}
            className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 text-white"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Large image */}
          <div className="relative aspect-square w-full">
            {profileImage ? (
              <Image
                src={profileImage}
                alt={fullName}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 500px"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F3CFC6] to-[#C4C4C4]">
                <span className="text-6xl font-bold text-white">
                  {initials}
                </span>
              </div>
            )}
          </div>

          {/* User info footer */}
          <div className="p-4 bg-black/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">{fullName}</h3>
                <p
                  className={cn(
                    "text-sm",
                    displayIsOnline ? "text-green-400" : "text-gray-400"
                  )}
                >
                  {displayIsOnline ? "Online now" : lastOnlineText}
                </p>
              </div>
              <Button
                asChild
                size="sm"
                className="bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-900"
              >
                <Link
                  href={profileHref}
                  onClick={() => {
                    setImageExpanded(false);
                    onClose();
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  View Profile
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfilePreviewDialog;
