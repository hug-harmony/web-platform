"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { allSlots } from "@/lib/constants";

// --- Animation presets ---
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, staggerChildren: 0.1 },
  },
};

const itemVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ManageAvailabilityPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [specialistId, setSpecialistId] = useState<string | null>(null);

  // --- Each day has its own slots + breakDuration
  const [availability, setAvailability] = useState<
    Record<number, { slots: string[]; breakDuration: number }>
  >({});

  const specialistIdFromQuery = searchParams.get("specialistId");

  // --- Verify authentication ---
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // --- Verify specialist ---
  useEffect(() => {
    const init = async () => {
      if (status !== "authenticated") return;
      try {
        const res = await fetch("/api/specialists/application/me", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        const { status: appStatus, specialistId: fetchedId } = await res.json();
        if (appStatus !== "approved" || !fetchedId) {
          toast.error("Approved specialist profile required");
          router.push("/dashboard");
          return;
        }
        if (specialistIdFromQuery && specialistIdFromQuery !== fetchedId) {
          toast.error("Invalid specialist ID");
          router.push("/dashboard");
          return;
        }
        setSpecialistId(fetchedId);
      } catch {
        toast.error("Verification failed");
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [status, router, specialistIdFromQuery]);

  // --- Load data for all 7 days ---
  useEffect(() => {
    if (!specialistId) return;
    const load = async () => {
      try {
        const weekData: Record<
          number,
          { slots: string[]; breakDuration: number }
        > = {};
        for (let i = 0; i < 7; i++) {
          const res = await fetch(
            `/api/specialists/availability?specialistId=${specialistId}&dayOfWeek=${i}`
          );
          if (res.ok) {
            const { slots, breakDuration } = await res.json();
            weekData[i] = {
              slots: slots ?? [],
              breakDuration: breakDuration ?? 30,
            };
          } else {
            weekData[i] = { slots: [], breakDuration: 30 };
          }
        }
        setAvailability(weekData);
      } catch {
        toast.error("Failed to load availability");
      }
    };
    load();
  }, [specialistId]);

  // --- Toggle a single slot ---
  const toggleSlot = (day: number, slot: string) => {
    setAvailability((prev) => {
      const current = prev[day]?.slots ?? [];
      const newSlots = current.includes(slot)
        ? current.filter((t) => t !== slot)
        : [...current, slot];
      return { ...prev, [day]: { ...prev[day], slots: newSlots } };
    });
  };

  // --- Change break duration for a day ---
  const changeBreakDuration = (day: number, val: number) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], breakDuration: val },
    }));
  };

  // --- Mark entire day available / clear day ---
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

  // --- Mark all days fully available / clear all ---
  const toggleAllDays = () => {
    const allFull = Object.values(availability).every(
      (d) => d?.slots.length === allSlots.length
    );
    const newData: Record<number, { slots: string[]; breakDuration: number }> =
      {};
    for (let i = 0; i < 7; i++) {
      newData[i] = {
        ...availability[i],
        slots: allFull ? [] : [...allSlots],
      };
    }
    setAvailability(newData);
  };

  // --- Save all data ---
  const save = async () => {
    if (!specialistId) return;
    try {
      for (const [dayOfWeek, { slots, breakDuration }] of Object.entries(
        availability
      )) {
        const res = await fetch("/api/specialists/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayOfWeek: Number(dayOfWeek),
            slots,
            breakDuration,
            specialistId,
          }),
          credentials: "include",
        });
        if (!res.ok) throw new Error();
      }
      toast.success("Availability saved for all days");
    } catch {
      toast.error("Failed to save availability");
    }
  };

  // --- Loading skeleton ---
  if (status === "loading" || loading)
    return (
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );

  if (status === "unauthenticated") return null;

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* --- Header --- */}
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-black">
            Manage Availability
          </CardTitle>
          <p className="text-sm text-black">
            Set your availability for each day. You can also mark all days
            available instantly.
          </p>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <Button asChild variant="outline" className="rounded-full">
            <Link href={`/dashboard/profile/${session?.user?.id}`}>
              <MessageSquare className="mr-2 h-4 w-4" /> Back to Profile
            </Link>
          </Button>
          <Button
            onClick={toggleAllDays}
            className="bg-[#ffffff] hover:bg-[#C4C4C4] text-black rounded-full"
          >
            Mark All Days{" "}
            {Object.values(availability).every(
              (d) => d?.slots.length === allSlots.length
            )
              ? "Unavailable"
              : "Available"}
          </Button>
        </CardContent>
      </Card>

      {/* --- Weekly Grid --- */}
      <Card className="shadow-lg">
        <CardContent className="space-y-8 pt-6">
          {days.map((day, i) => (
            <motion.div key={i} variants={itemVariants} className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{day}</h3>
                <div className="flex items-center space-x-3">
                  <Label className="text-sm text-gray-600">Break</Label>
                  <Select
                    value={availability[i]?.breakDuration?.toString() ?? "30"}
                    onValueChange={(v) => changeBreakDuration(i, Number(v))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hr</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => toggleAllDay(i)}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                  >
                    {availability[i]?.slots.length === allSlots.length
                      ? "Clear Day"
                      : "All Day"}
                  </Button>
                </div>
              </div>

              {/* --- Slots --- */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {allSlots.map((slot) => {
                  const selected = availability[i]?.slots.includes(slot);
                  return (
                    <div
                      key={slot}
                      onClick={() => toggleSlot(i, slot)}
                      className={`flex items-center justify-center p-2 rounded cursor-pointer border transition 
                      ${
                        selected
                          ? "bg-[#F3CFC6] border-[#F3CFC6] text-black"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleSlot(i, slot)}
                        className="mr-2"
                      />
                      {slot}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {/* --- Summary --- */}
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="text-sm text-gray-600">
              Total selected slots:{" "}
              <Badge>
                {Object.values(availability).flatMap((d) => d?.slots).length}
              </Badge>
            </div>
            <Button
              onClick={save}
              className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black rounded-full"
            >
              Save Availability
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ManageAvailabilityPage;
