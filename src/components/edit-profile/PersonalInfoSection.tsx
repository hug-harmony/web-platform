
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { ProfilePictureUpload } from "./ProfilePictureUpload";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { Profile } from "@/types/edit-profile";
import { motion } from "framer-motion";
import {
  User,
  Phone,
  MapPin,
  FileText,
  Heart,
  Compass,
  Ruler,
  Users,
  Star,
  Palette,
  Film,
  PawPrint,
  Pencil,
  X,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  LucideIcon,
} from "lucide-react";

interface FieldConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  required?: boolean;
  maxLength?: number;
  type?: string;
  isLocation?: boolean;
  isTextarea?: boolean;
  isSelect?: boolean;
  options?: string[];
  placeholder?: string;
}

interface Props {
  profile: Profile;
  setProfile: (p: Profile) => void;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  updating: boolean;
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  formErrors: Record<string, string>;

  locationProps: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

// Field configuration for cleaner rendering
const FIELD_CONFIG = {
  basic: [
    {
      key: "firstName",
      label: "First Name",
      icon: User,
      required: true,
      maxLength: 50,
    },
    {
      key: "lastName",
      label: "Last Name",
      icon: User,
      required: true,
      maxLength: 50,
    },
  ],
  contact: [
    { key: "phoneNumber", label: "Phone Number", icon: Phone, type: "tel" },
    { key: "location", label: "Location", icon: MapPin, isLocation: true },
  ],
  about: [
    {
      key: "biography",
      label: "Bio",
      icon: FileText,
      isTextarea: true,
      maxLength: 500,
    },
  ],
  personal: [
    {
      key: "relationshipStatus",
      label: "Relationship Status",
      icon: Heart,
      isSelect: true,
      options: [
        "Single",
        "In a relationship",
        "Married",
        "Divorced",
        "Widowed",
        "Prefer not to say",
      ],
    },
    {
      key: "orientation",
      label: "Orientation",
      icon: Compass,
      isSelect: true,
      options: [
        "Heterosexual",
        "Homosexual",
        "Bisexual",
        "Asexual",
        "Other",
        "Prefer not to say",
      ],
    },
    {
      key: "height",
      label: "Height",
      icon: Ruler,
      placeholder: "e.g., 5'10 or 178 cm",
      maxLength: 20,
    },
    { key: "ethnicity", label: "Ethnicity", icon: Users, maxLength: 50 },
  ],
  preferences: [
    {
      key: "zodiacSign",
      label: "Zodiac Sign",
      icon: Star,
      isSelect: true,
      options: [
        "Aries",
        "Taurus",
        "Gemini",
        "Cancer",
        "Leo",
        "Virgo",
        "Libra",
        "Scorpio",
        "Sagittarius",
        "Capricorn",
        "Aquarius",
        "Pisces",
      ],
    },
    {
      key: "favoriteColor",
      label: "Favorite Color",
      icon: Palette,
      maxLength: 30,
    },
    {
      key: "favoriteMedia",
      label: "Favorite Movie/TV Show",
      icon: Film,
      maxLength: 100,
    },
    {
      key: "petOwnership",
      label: "Pet Ownership",
      icon: PawPrint,
      isSelect: true,
      options: ["Dog", "Cat", "Other", "None"],
    },
  ],
};

// Reusable Field Display Component (View Mode)
function FieldDisplay({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon: React.ElementType;
}) {
  const hasValue = value && value.trim() !== "";

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="h-9 w-9 rounded-full bg-[#F3CFC6]/20 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-[#F3CFC6]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {label}
        </p>
        <p
          className={`text-sm mt-0.5 break-words ${hasValue ? "text-black" : "text-gray-400 italic"
            }`}
        >
          {hasValue ? value : "Not provided"}
        </p>
      </div>
      {hasValue && (
        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-1" />
      )}
    </div>
  );
}

// Reusable Field Input Component (Edit Mode)
function FieldInput({
  field,
  profile,
  setProfile,
  updating,
  error,
  locationProps,
}: {
  field: FieldConfig;
  profile: Profile;
  setProfile: (p: Profile) => void;
  updating: boolean;
  error?: string;
  locationProps?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const Icon = field.icon;
  const value = (profile[field.key as keyof Profile] as string) || "";

  const handleChange = (newValue: string) => {
    setProfile({ ...profile, [field.key]: newValue });
  };

  return (
    <div className="space-y-2">
      <Label
        htmlFor={field.key}
        className="text-sm font-medium text-gray-700 flex items-center gap-2"
      >
        <Icon className="h-4 w-4 text-[#F3CFC6]" />
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </Label>

      {field.isLocation ? (
        <LocationAutocomplete
          value={value}
          onChange={handleChange}
          disabled={updating}
          {...locationProps}
        />
      ) : field.isTextarea ? (
        <div className="space-y-1">
          <Textarea
            id={field.key}
            name={field.key}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            disabled={updating}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            className="border-gray-200 focus:border-[#F3CFC6] focus:ring-[#F3CFC6]/20 min-h-[100px] resize-none"
          />
          {field.maxLength && (
            <p className="text-xs text-gray-400 text-right">
              {value.length}/{field.maxLength}
            </p>
          )}
        </div>
      ) : field.isSelect ? (
        <Select
          name={field.key}
          value={value}
          onValueChange={handleChange}
          disabled={updating}
        >
          <SelectTrigger className="border-gray-200 focus:border-[#F3CFC6] focus:ring-[#F3CFC6]/20">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={field.key}
          name={field.key}
          type={field.type || "text"}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={updating}
          required={field.required}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          className="border-gray-200 focus:border-[#F3CFC6] focus:ring-[#F3CFC6]/20"
        />
      )}

      {error && (
        <p className="text-red-500 text-xs flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// Section Card Component
function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-800">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function PersonalInfoSection({
  profile,
  setProfile,
  isEditing,
  setIsEditing,
  updating,
  selectedFile,
  setSelectedFile,
  formErrors,
  locationProps,
  handleSubmit,
}: Props) {
  // Calculate profile completion
  const allFields = [
    ...FIELD_CONFIG.basic,
    ...FIELD_CONFIG.contact,
    ...FIELD_CONFIG.about,
    ...FIELD_CONFIG.personal,
    ...FIELD_CONFIG.preferences,
  ];
  const filledFields = allFields.filter((field) => {
    const value = profile[field.key as keyof Profile];
    return value && String(value).trim() !== "";
  }).length;
  const completionPercent = Math.round((filledFields / allFields.length) * 100);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black flex items-center gap-2">
            <User className="h-5 w-5 text-[#F3CFC6]" />
            Personal Details
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your personal information
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Completion Badge */}
          <Badge
            variant="secondary"
            className={`${completionPercent === 100
              ? "bg-green-100 text-green-700"
              : completionPercent >= 50
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-700"
              }`}
          >
            {completionPercent}% Complete
          </Badge>

          {/* Edit Button (View Mode) */}
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="rounded-full border-[#F3CFC6] text-gray-700 hover:bg-[#F3CFC6]/10"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        /* ==================== EDIT MODE ==================== */
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Profile Picture */}
          <motion.div variants={itemVariants}>
            <SectionCard title="Profile Picture">
              <ProfilePictureUpload
                profileImage={profile.profileImage}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                isEditing={isEditing}
                updating={updating}
                error={formErrors.profileImage}
              />
            </SectionCard>
          </motion.div>

          {/* Basic Info */}
          <motion.div variants={itemVariants}>
            <SectionCard title="Basic Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FIELD_CONFIG.basic.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    profile={profile}
                    setProfile={setProfile}
                    updating={updating}
                    error={formErrors[field.key]}
                  />
                ))}
              </div>
            </SectionCard>
          </motion.div>

          {/* Contact Info */}
          <motion.div variants={itemVariants}>
            <SectionCard title="Contact & Location">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FIELD_CONFIG.contact.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    profile={profile}
                    setProfile={setProfile}
                    updating={updating}
                    error={formErrors[field.key]}
                    locationProps={field.isLocation ? locationProps : undefined}
                  />
                ))}
              </div>
            </SectionCard>
          </motion.div>

          {/* About */}
          <motion.div variants={itemVariants}>
            <SectionCard title="About You">
              {FIELD_CONFIG.about.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  profile={profile}
                  setProfile={setProfile}
                  updating={updating}
                  error={formErrors[field.key]}
                />
              ))}
            </SectionCard>
          </motion.div>

          {/* Personal Details */}
          <motion.div variants={itemVariants}>
            <SectionCard title="Personal Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FIELD_CONFIG.personal.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    profile={profile}
                    setProfile={setProfile}
                    updating={updating}
                    error={formErrors[field.key]}
                  />
                ))}
              </div>
            </SectionCard>
          </motion.div>

          {/* Preferences */}
          <motion.div variants={itemVariants}>
            <SectionCard title="Preferences & Interests">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FIELD_CONFIG.preferences.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    profile={profile}
                    setProfile={setProfile}
                    updating={updating}
                    error={formErrors[field.key]}
                  />
                ))}
              </div>
            </SectionCard>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex justify-end gap-3 pt-4 border-t"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={updating}
              className="rounded-full"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updating}
              className="bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800 rounded-full min-w-[120px]"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </motion.div>
        </motion.form>
      ) : (
        /* ==================== VIEW MODE ==================== */
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Basic Info */}
          <motion.div variants={itemVariants}>
            <SectionCard title="Basic Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FIELD_CONFIG.basic.map((field) => (
                  <FieldDisplay
                    key={field.key}
                    label={field.label}
                    value={profile[field.key as keyof Profile] as string}
                    icon={field.icon}
                  />
                ))}
              </div>
            </SectionCard>
          </motion.div>

          {/* Contact Info */}
          <motion.div variants={itemVariants}>
            <SectionCard title="Contact & Location">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FIELD_CONFIG.contact.map((field) => (
                  <FieldDisplay
                    key={field.key}
                    label={field.label}
                    value={profile[field.key as keyof Profile] as string}
                    icon={field.icon}
                  />
                ))}
              </div>
            </SectionCard>
          </motion.div>

          {/* About */}
          <motion.div variants={itemVariants}>
            <SectionCard title="About You">
              {FIELD_CONFIG.about.map((field) => (
                <FieldDisplay
                  key={field.key}
                  label={field.label}
                  value={profile[field.key as keyof Profile] as string}
                  icon={field.icon}
                />
              ))}
            </SectionCard>
          </motion.div>

          {/* Personal Details */}
          <motion.div variants={itemVariants}>
            <SectionCard title="Personal Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FIELD_CONFIG.personal.map((field) => (
                  <FieldDisplay
                    key={field.key}
                    label={field.label}
                    value={profile[field.key as keyof Profile] as string}
                    icon={field.icon}
                  />
                ))}
              </div>
            </SectionCard>
          </motion.div>

          {/* Preferences */}
          <motion.div variants={itemVariants}>
            <SectionCard title="Preferences & Interests">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FIELD_CONFIG.preferences.map((field) => (
                  <FieldDisplay
                    key={field.key}
                    label={field.label}
                    value={profile[field.key as keyof Profile] as string}
                    icon={field.icon}
                  />
                ))}
              </div>
            </SectionCard>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
