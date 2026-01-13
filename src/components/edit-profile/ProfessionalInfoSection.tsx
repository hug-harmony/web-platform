"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Briefcase,
  FileText,
  DollarSign,
  MapPin,
  Pencil,
  X,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Star,
  Video,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { validateProfessionalProfileForm } from "@/lib/validate-edit-profile";
import { Profile } from "@/types/edit-profile";
import { PaymentMethodStatus } from "./PaymentMethodStatus";
import { PaymentAcceptanceMethodsSection } from "./PaymentAcceptanceMethodsSection";

interface Props {
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  professionalId: string;
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

// Field configuration
const PROFESSIONAL_FIELDS = [
  {
    key: "biography",
    label: "Professional Bio",
    icon: FileText,
    isTextarea: true,
    maxLength: 500,
    required: true,
    placeholder: "Tell clients about your experience and expertise...",
  },
  {
    key: "rate",
    label: "Rate (per session)",
    icon: DollarSign,
    type: "number",
    required: true,
    prefix: "$",
  },
  {
    key: "offersVideo",
    label: "Offers Video Sessions",
    icon: Video,
    type: "boolean",
  },
  {
    key: "videoRate",
    label: "Video Session Rate",
    icon: DollarSign,
    type: "number",
    prefix: "$",
    dependsOn: "offersVideo",
  },
  {
    key: "venue",
    label: "Venue Preference",
    icon: MapPin,
    isSelect: true,
    options: [
      { value: "host", label: "Host (Clients come to you)" },
      { value: "visit", label: "Visit (You go to clients)" },
      { value: "both", label: "Both" },
    ],
    required: true,
  },
];

// Field Display Component (View Mode)
function FieldDisplay({
  label,
  value,
  icon: Icon,
  prefix,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  icon: React.ElementType;
  prefix?: string;
}) {
  const hasValue = value !== null && value !== undefined && value !== "";
  const displayValue = hasValue
    ? prefix
      ? `${prefix}${typeof value === "number" ? value.toFixed(2) : value}`
      : typeof value === "string"
        ? value.charAt(0).toUpperCase() + value.slice(1)
        : value
    : null;

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="h-10 w-10 rounded-full bg-[#F3CFC6]/20 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-[#F3CFC6]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {label}
        </p>
        <p
          className={`text-sm mt-1 break-words ${hasValue ? "text-black" : "text-gray-400 italic"
            }`}
        >
          {typeof value === "boolean"
            ? (value ? "Yes" : "No")
            : (displayValue || "Not provided")}
        </p>
      </div>
      {hasValue && value !== false && (
        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-1" />
      )}
    </div>
  );
}

// Field Input Component (Edit Mode)
function FieldInput({
  field,
  value,
  onChange,
  updating,
  error,
}: {
  field: (typeof PROFESSIONAL_FIELDS)[0];
  value: string | number | boolean | null | undefined;
  onChange: (value: string | number | boolean | null) => void;
  updating: boolean;
  error?: string;
}) {
  const Icon = field.icon;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#F3CFC6]" />
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </Label>

      {field.type === "boolean" ? (
        <div className="flex items-center space-x-2 py-2">
          <Switch
            id={field.key}
            checked={!!value}
            onCheckedChange={(checked) => onChange(checked)}
            disabled={updating}
          />
          <span className="text-sm text-gray-600">
            {value ? "Enabled" : "Disabled"}
          </span>
        </div>
      ) : field.isTextarea ? (
        <div className="space-y-1">
          <Textarea
            name={field.key}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={updating}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            className="border-gray-200 focus:border-[#F3CFC6] focus:ring-[#F3CFC6]/20 min-h-[120px] resize-none"
            required={field.required}
          />
          {field.maxLength && (
            <p className="text-xs text-gray-400 text-right">
              {((value as string) || "").length}/{field.maxLength}
            </p>
          )}
        </div>
      ) : field.isSelect ? (
        <Select
          name={field.key}
          value={(value as string) || ""}
          onValueChange={(v) => onChange(v)}
          disabled={updating}
        >
          <SelectTrigger className="border-gray-200 focus:border-[#F3CFC6] focus:ring-[#F3CFC6]/20">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="relative">
          {field.prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {field.prefix}
            </span>
          )}
          <Input
            name={field.key}
            type={field.type || "text"}
            value={typeof value === "boolean" ? "" : (value ?? "")}
            onChange={(e) =>
              onChange(
                field.type === "number"
                  ? parseFloat(e.target.value) || null
                  : e.target.value
              )
            }
            disabled={updating}
            step={field.type === "number" ? "0.01" : undefined}
            min={field.type === "number" ? "0" : undefined}
            className={`border-gray-200 focus:border-[#F3CFC6] focus:ring-[#F3CFC6]/20 ${field.prefix ? "pl-7" : ""
              }`}
            required={field.required}
          />
        </div>
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

export function ProfessionalInfoSection({
  profile,
  setProfile,
  professionalId,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Calculate completion
  const filledFields = PROFESSIONAL_FIELDS.filter((field) => {
    const value = profile?.[field.key as keyof Profile];
    return value !== null && value !== undefined && value !== "";
  }).length;
  const completionPercent = Math.round(
    (filledFields / PROFESSIONAL_FIELDS.length) * 100
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdating(true);
    setFormErrors({});

    const form = new FormData(e.currentTarget);
    const errors = validateProfessionalProfileForm(form);

    if (!profile || Object.keys(errors).length) {
      setFormErrors(errors);
      toast.error("Please fix the errors");
      setUpdating(false);
      return;
    }

    try {
      const payload = {
        biography: form.get("biography")?.toString().trim() ?? null,
        rate: parseFloat(form.get("rate")?.toString() ?? "0") || null,
        offersVideo: profile.offersVideo,
        videoRate: profile.offersVideo ? profile.videoRate : null,
        venue: form.get("venue") as "host" | "visit" | "both" | null,
      };

      const res = await fetch(`/api/professionals/${professionalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Update failed");
      }

      const updated = await res.json();

      setProfile((prev) =>
        prev
          ? {
            ...prev,
            biography: updated.biography ?? prev.biography,
            rate: updated.rate ?? prev.rate,
            offersVideo: updated.offersVideo ?? prev.offersVideo,
            videoRate: updated.videoRate ?? prev.videoRate,
            venue: updated.venue ?? prev.venue,
          }
          : prev
      );

      toast.success("Professional profile updated");
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdating(false);
    }
  };

  const handlePaymentMethodsUpdate = (methods: string[]) => {
    setProfile((prev) =>
      prev
        ? {
          ...prev,
          paymentAcceptanceMethods: methods,
        }
        : prev
    );
  };

  if (!profile) {
    return (
      <Card className="border-gray-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#F3CFC6] mr-2" />
          <span className="text-gray-500">Loading professional details...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#F3CFC6]" />
            Professional Profile
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your professional information
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
            <Star className="h-3 w-3 mr-1" />
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
              Edit
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
          <motion.div variants={itemVariants}>
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800">
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {PROFESSIONAL_FIELDS.map((field) => {
                  if (field.dependsOn && !profile[field.dependsOn as keyof Profile]) {
                    return null;
                  }
                  return (
                    <FieldInput
                      key={field.key}
                      field={field}
                      value={
                        profile[field.key as keyof Profile] as
                        | string
                        | number
                        | boolean
                        | null
                      }
                      onChange={(value) =>
                        setProfile((prev) => prev ? { ...prev, [field.key]: value } : prev)
                      }
                      updating={updating}
                      error={formErrors[field.key]}
                    />
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex justify-end gap-3 pt-4 border-t"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setFormErrors({});
              }}
              disabled={updating}
              className="rounded-full"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updating}
              className="bg-[#F3CFC6] hover:bg-[#e9bfb5] text-gray-800 rounded-full min-w-[140px]"
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
          <motion.div variants={itemVariants}>
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800">
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {PROFESSIONAL_FIELDS.map((field) => {
                  if (field.dependsOn && !profile[field.dependsOn as keyof Profile]) {
                    return null;
                  }
                  return (
                    <FieldDisplay
                      key={field.key}
                      label={field.label}
                      value={
                        profile[field.key as keyof Profile] as
                        | string
                        | number
                        | boolean
                        | null
                      }
                      icon={field.icon}
                      prefix={field.prefix}
                    />
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Payment Acceptance Methods */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="pt-2"
      >
        <PaymentAcceptanceMethodsSection
          professionalId={professionalId}
          initialMethods={profile.paymentAcceptanceMethods || []}
          onUpdate={handlePaymentMethodsUpdate}
        />
      </motion.div>

      {/* Payment Method Status */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="pt-2"
      >
        <PaymentMethodStatus professionalId={professionalId} />
      </motion.div>
    </div>
  );
}
