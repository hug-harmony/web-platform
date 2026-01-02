// src\app\dashboard\availability\ManageAvailabilityPage.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { allSlots } from "@/lib/constants";

// Animation presets
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const days = [
  { short: "Sun", full: "Sunday" },
  { short: "Mon", full: "Monday" },
  { short: "Tue", full: "Tuesday" },
  { short: "Wed", full: "Wednesday" },
  { short: "Thu", full: "Thursday" },
  { short: "Fri", full: "Friday" },
  { short: "Sat", full: "Saturday" },
];

// Group slots by time period for better UX
const slotGroups = [
  {
    label: "Morning",
    range: "12:00 AM - 11:30 AM",
    slots: allSlots.slice(0, 24),
  },
  {
    label: "Afternoon",
    range: "12:00 PM - 5:30 PM",
    slots: allSlots.slice(24, 36),
  },
  {
    label: "Evening",
    range: "6:00 PM - 11:30 PM",
    slots: allSlots.slice(36, 48),
  },
];

interface DayAvailability {
  slots: string[];
  breakDuration: number;
}

const ManageAvailabilityPage: React.FC = () => {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Each day has its own slots + breakDuration
  const [availability, setAvailability] = useState<
    Record<number, DayAvailability>
  >({});
  const [originalAvailability, setOriginalAvailability] = useState<
    Record<number, DayAvailability>
  >({});

  // Verify authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Verify professional status
  const verifyProfessional = useCallback(async () => {
    if (status !== "authenticated") return;

    try {
      // ✅ FIX: Use correct endpoint with query parameter
      const res = await fetch("/api/professionals/application?me=true", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to verify professional status");
      }

      const data = await res.json();

      if (data.status !== "APPROVED" || !data.professionalId) {
        toast.error(
          "You need an approved professional profile to manage availability"
        );
        router.push("/dashboard/edit-profile/professional-application");
        return;
      }

      setProfessionalId(data.professionalId);
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Failed to verify professional status");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [status, router]);

  useEffect(() => {
    verifyProfessional();
  }, [verifyProfessional]);

  // Load availability data for all 7 days
  const loadAvailability = useCallback(async () => {
    if (!professionalId) return;

    try {
      const weekData: Record<number, DayAvailability> = {};

      // Fetch all days in parallel for better performance
      const promises = Array.from({ length: 7 }, (_, i) =>
        fetch(
          `/api/professionals/availability?professionalId=${professionalId}&dayOfWeek=${i}`,
          { credentials: "include" }
        ).then(async (res) => {
          if (res.ok) {
            const { slots, breakDuration } = await res.json();
            return {
              day: i,
              slots: slots ?? [],
              breakDuration: breakDuration ?? 30,
            };
          }
          return { day: i, slots: [], breakDuration: 30 };
        })
      );

      const results = await Promise.all(promises);
      results.forEach(({ day, slots, breakDuration }) => {
        weekData[day] = { slots, breakDuration };
      });

      setAvailability(weekData);
      setOriginalAvailability(JSON.parse(JSON.stringify(weekData)));
      setHasChanges(false);
    } catch (error) {
      console.error("Load availability error:", error);
      toast.error("Failed to load availability");
    }
  }, [professionalId]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  // Check for unsaved changes
  useEffect(() => {
    const changed =
      JSON.stringify(availability) !== JSON.stringify(originalAvailability);
    setHasChanges(changed);
  }, [availability, originalAvailability]);

  // Toggle a single slot
  const toggleSlot = (day: number, slot: string) => {
    setAvailability((prev) => {
      const current = prev[day]?.slots ?? [];
      const newSlots = current.includes(slot)
        ? current.filter((t) => t !== slot)
        : [...current, slot];
      return {
        ...prev,
        [day]: { ...prev[day], slots: newSlots },
      };
    });
  };

  // Toggle all slots in a group (morning/afternoon/evening)
  const toggleSlotGroup = (day: number, groupSlots: string[]) => {
    setAvailability((prev) => {
      const current = prev[day]?.slots ?? [];
      const allSelected = groupSlots.every((s) => current.includes(s));

      let newSlots: string[];
      if (allSelected) {
        // Remove all group slots
        newSlots = current.filter((s) => !groupSlots.includes(s));
      } else {
        // Add all group slots
        newSlots = [...new Set([...current, ...groupSlots])];
      }

      return {
        ...prev,
        [day]: { ...prev[day], slots: newSlots },
      };
    });
  };

  // Change break duration for a day
  const changeBreakDuration = (day: number, val: number) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], breakDuration: val },
    }));
  };

  // Mark entire day available / clear day
  const toggleAllDay = (day: number) => {
    setAvailability((prev) => {
      const allSelected = prev[day]?.slots.length === allSlots.length;
      return {
        ...prev,
        [day]: {
          ...prev[day],
          slots: allSelected ? [] : [...allSlots],
        },
      };
    });
  };

  // Mark all days fully available / clear all
  const toggleAllDays = () => {
    const allFull = Object.values(availability).every(
      (d) => d?.slots.length === allSlots.length
    );
    const newData: Record<number, DayAvailability> = {};
    for (let i = 0; i < 7; i++) {
      newData[i] = {
        ...availability[i],
        breakDuration: availability[i]?.breakDuration ?? 30,
        slots: allFull ? [] : [...allSlots],
      };
    }
    setAvailability(newData);
  };

  // Copy from one day to others
  const copyToAllDays = (sourceDay: number) => {
    const sourceData = availability[sourceDay];
    if (!sourceData) return;

    const newData: Record<number, DayAvailability> = {};
    for (let i = 0; i < 7; i++) {
      newData[i] = { ...sourceData };
    }
    setAvailability(newData);
    toast.success(`Copied ${days[sourceDay].full}'s schedule to all days`);
  };

  // Save all data
  const save = async () => {
    if (!professionalId) return;

    setSaving(true);
    try {
      const promises = Object.entries(availability).map(
        ([dayOfWeek, { slots, breakDuration }]) =>
          fetch("/api/professionals/availability", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dayOfWeek: Number(dayOfWeek),
              slots,
              breakDuration,
              professionalId,
            }),
            credentials: "include",
          })
      );

      const results = await Promise.all(promises);
      const allSuccessful = results.every((r) => r.ok);

      if (allSuccessful) {
        toast.success("Availability saved successfully!");
        setOriginalAvailability(JSON.parse(JSON.stringify(availability)));
        setHasChanges(false);
      } else {
        throw new Error("Some days failed to save");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  // Reset to original
  const resetChanges = () => {
    setAvailability(JSON.parse(JSON.stringify(originalAvailability)));
    setHasChanges(false);
    toast.info("Changes discarded");
  };

  // Calculate stats
  const totalSlots = Object.values(availability).reduce(
    (acc, d) => acc + (d?.slots.length ?? 0),
    0
  );
  const daysWithAvailability = Object.values(availability).filter(
    (d) => d?.slots.length > 0
  ).length;

  // Loading skeleton
  if (status === "loading" || loading) {
    return <AvailabilitySkeleton />;
  }

  if (status === "unauthenticated") return null;

  return (
    <motion.div
      className="p-4 space-y-6 max-w-5xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full bg-white/80 hover:bg-white"
            >
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadAvailability}
              className="rounded-full"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-md">
              <Calendar className="h-6 w-6 text-[#F3CFC6]" />
            </div>
            <div>
              <CardTitle className="text-2xl text-black">
                Manage Availability
              </CardTitle>
              <p className="text-sm text-black/70">
                Set when you&apos;re available for appointments
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats & Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#F3CFC6]">{totalSlots}</p>
              <p className="text-xs text-muted-foreground">Total Slots</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#F3CFC6]">
                {daysWithAvailability}
              </p>
              <p className="text-xs text-muted-foreground">Days Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="pt-4 pb-4 flex items-center justify-center gap-3">
            <Button
              onClick={toggleAllDays}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              {Object.values(availability).every(
                (d) => d?.slots.length === allSlots.length
              ) ? (
                <>
                  <XCircle className="mr-2 h-4 w-4" /> Clear All
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" /> Mark All Available
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Unsaved Changes Alert */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert className="border-amber-500 bg-amber-50">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Unsaved Changes</AlertTitle>
            <AlertDescription className="text-amber-700 flex items-center justify-between">
              <span>You have unsaved changes to your availability.</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetChanges}
                  className="rounded-full"
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={save}
                  disabled={saving}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-full"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Save
                    </>
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Weekly Schedule */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {days.map((day, i) => {
            const dayData = availability[i] || { slots: [], breakDuration: 30 };
            const isExpanded = expandedDay === i;
            const slotCount = dayData.slots.length;
            const isFullDay = slotCount === allSlots.length;

            return (
              <motion.div
                key={i}
                variants={itemVariants}
                className="border rounded-xl overflow-hidden"
              >
                {/* Day Header */}
                <div
                  className={`
                    flex items-center justify-between p-4 cursor-pointer transition-colors
                    ${isExpanded ? "bg-[#F3CFC6]/20" : "hover:bg-gray-50"}
                  `}
                  onClick={() => setExpandedDay(isExpanded ? null : i)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        h-10 w-10 rounded-full flex items-center justify-center font-semibold
                        ${slotCount > 0 ? "bg-[#F3CFC6] text-black" : "bg-gray-200 text-gray-500"}
                      `}
                    >
                      {day.short.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{day.full}</p>
                      <p className="text-xs text-muted-foreground">
                        {slotCount === 0
                          ? "No availability"
                          : isFullDay
                            ? "Full day available"
                            : `${slotCount} slots selected`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant={slotCount > 0 ? "default" : "secondary"}
                      className={slotCount > 0 ? "bg-[#F3CFC6] text-black" : ""}
                    >
                      {slotCount} / {allSlots.length}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAllDay(i);
                      }}
                      className="rounded-full"
                    >
                      {isFullDay ? "Clear" : "All Day"}
                    </Button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t bg-gray-50 p-4 space-y-4"
                  >
                    {/* Break Duration */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">
                          Break between appointments:
                        </Label>
                        <Select
                          value={dayData.breakDuration?.toString() ?? "30"}
                          onValueChange={(v) =>
                            changeBreakDuration(i, Number(v))
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="90">1.5 hr</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToAllDays(i)}
                        className="rounded-full text-xs"
                      >
                        Copy to All Days
                      </Button>
                    </div>

                    {/* Slot Groups */}
                    {slotGroups.map((group) => {
                      const groupSelected = group.slots.filter((s) =>
                        dayData.slots.includes(s)
                      ).length;
                      const allGroupSelected =
                        groupSelected === group.slots.length;

                      return (
                        <div key={group.label} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {group.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {group.range}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSlotGroup(i, group.slots)}
                              className="text-xs"
                            >
                              {allGroupSelected ? "Clear" : "Select All"}
                            </Button>
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1">
                            {group.slots.map((slot) => {
                              const selected = dayData.slots.includes(slot);
                              return (
                                <div
                                  key={slot}
                                  onClick={() => toggleSlot(i, slot)}
                                  className={`
                                    flex items-center justify-center p-2 rounded text-xs cursor-pointer 
                                    border transition-all
                                    ${
                                      selected
                                        ? "bg-[#F3CFC6] border-[#F3CFC6] text-black font-medium"
                                        : "bg-white hover:bg-gray-100 border-gray-200"
                                    }
                                  `}
                                >
                                  {slot
                                    .replace(":00", "")
                                    .replace(":30", ":30")}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        {hasChanges && (
          <Button
            variant="outline"
            onClick={resetChanges}
            className="rounded-full"
          >
            Discard Changes
          </Button>
        )}
        <Button
          onClick={save}
          disabled={saving || !hasChanges}
          className="bg-[#F3CFC6] hover:bg-[#e5b8ad] text-black rounded-full min-w-[140px]"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

// Skeleton Loader
function AvailabilitySkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4]">
        <CardHeader className="pb-2">
          <div className="flex justify-between">
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <div className="text-center space-y-2">
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default ManageAvailabilityPage;
