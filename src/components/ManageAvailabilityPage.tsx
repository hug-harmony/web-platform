"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { allSlots } from "@/lib/constants";
import { motion } from "framer-motion";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import {
  Calendar as BigCalendar,
  momentLocalizer,
  SlotInfo,
} from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, startOfToday } from "date-fns";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const localizer = momentLocalizer(moment);

const ManageAvailabilityPage: React.FC = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [breakDuration, setBreakDuration] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [specialistId, setSpecialistId] = useState<string | null>(null);
  const [currentViewDate, setCurrentViewDate] = useState<Date>(new Date());
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  useEffect(() => {
    const fetchSpecialistStatus = async () => {
      try {
        const specialistIdFromQuery = searchParams.get("specialistId");
        const res = await fetch("/api/specialists/application/me", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok)
          throw new Error(`Failed to fetch specialist status: ${res.status}`);
        const { status: appStatus, specialistId: fetchedSpecialistId } =
          await res.json();
        if (appStatus !== "approved" || !fetchedSpecialistId) {
          toast.error(
            "You must have an approved specialist profile to manage availability."
          );
          router.push("/dashboard");
          return;
        }
        if (specialistIdFromQuery !== fetchedSpecialistId) {
          toast.error("Invalid specialist ID.");
          router.push("/dashboard");
          return;
        }
        setSpecialistId(fetchedSpecialistId);
        if (date) {
          fetchAvailability(fetchedSpecialistId);
        }
      } catch (err) {
        console.error("Fetch Specialist Status Error:", err);
        toast.error("Failed to verify specialist status. Please try again.");
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchSpecialistStatus();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router, searchParams, date]);

  const fetchAvailability = async (specialistId: string) => {
    if (!date) return;
    try {
      const res = await fetch(
        `/api/specialists/availability?specialistId=${specialistId}&date=${format(date, "yyyy-MM-dd")}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedSlots(data.slots || []);
        setBreakDuration(data.breakDuration || 30);
      } else {
        throw new Error("Failed to fetch availability");
      }
    } catch (err) {
      console.error("Fetch Availability Error:", err);
      toast.error("Failed to fetch availability. Please try again.");
    }
  };

  const isSlotValidWithBreak = (
    newSlot: string,
    currentSlots: string[],
    breakDuration: number
  ) => {
    const timeToMinutes = (time: string) => {
      const [hourStr, period] = time.split(" ");
      const [hour, minute] = hourStr.split(":").map(Number);
      return ((hour % 12) + (period === "PM" ? 12 : 0)) * 60 + minute;
    };
    const newSlotMinutes = timeToMinutes(newSlot);
    for (const slot of currentSlots) {
      const slotMinutes = timeToMinutes(slot);
      const gap = Math.abs(newSlotMinutes - slotMinutes);
      if (gap < breakDuration && gap !== 0) {
        return false;
      }
    }
    return true;
  };

  const toggleSlot = (time: string) => {
    setSelectedSlots((prev) => {
      if (prev.includes(time)) {
        return prev.filter((t) => t !== time);
      } else {
        if (isSlotValidWithBreak(time, prev, breakDuration)) {
          return [...prev, time].sort((a, b) => {
            const timeA = new Date(`1970-01-01 ${a}`);
            const timeB = new Date(`1970-01-01 ${b}`);
            return timeA.getTime() - timeB.getTime();
          });
        } else {
          toast.error(
            `Selected slot conflicts with ${breakDuration}-minute break requirement.`
          );
          return prev;
        }
      }
    });
  };

  const handleSubmitAvailability = async () => {
    if (!date || !specialistId) return;
    try {
      const res = await fetch("/api/specialists/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: format(date, "yyyy-MM-dd"),
          slots: selectedSlots,
          breakDuration,
          specialistId,
        }),
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Availability updated successfully");
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update availability");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update availability"
      );
    }
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const clickedDate = new Date(slotInfo.start);
    const today = startOfToday();

    if (clickedDate < today) return; // Disable past dates

    setDate(clickedDate);
  };

  const handleNavigate = (newDate: Date) => {
    setCurrentViewDate(newDate);
  };

  const dayPropGetter = (calendarDate: Date) => {
    const dateStr = format(calendarDate, "yyyy-MM-dd");
    const today = startOfToday();

    if (calendarDate < today) {
      return {
        className: "rbc-day-bg bg-gray-200 text-gray-400 cursor-not-allowed",
      };
    }
    if (date && dateStr === format(date, "yyyy-MM-dd")) {
      return { className: "rbc-day-bg bg-[#F3CFC6] text-black" };
    }
    return { className: "rbc-day-bg bg-green-100 cursor-pointer" };
  };

  if (status === "loading" || loading) {
    return (
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-[#C4C4C4]/50" />
              <Skeleton className="h-4 w-64 bg-[#C4C4C4]/50" />
            </div>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-40 w-full bg-[#C4C4C4]/50" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 bg-[#C4C4C4]/50" />
              <Skeleton className="h-10 w-full bg-[#C4C4C4]/50" />
            </div>
            <Skeleton className="h-40 w-full bg-[#C4C4C4]/50" />
            <Skeleton className="h-10 w-40 rounded-full bg-[#C4C4C4]/50" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <motion.div
      className="p-4 space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] shadow-lg">
        <CardHeader>
          <motion.div variants={itemVariants}>
            <CardTitle className="text-2xl text-black dark:text-white">
              Manage Availability
            </CardTitle>
            <p className="text-sm text-black">
              Set your availability for sessions. Select a date and available
              time slots.
            </p>
          </motion.div>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <motion.div
            variants={itemVariants}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
            }}
            transition={{ duration: 0.2 }}
          >
            <Button
              asChild
              variant="outline"
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-white dark:hover:bg-white rounded-full"
            >
              <Link href={`/dashboard/profile/${session?.user?.id}`}>
                <MessageSquare className="mr-2 h-4 w-4 text-[#F3CFC6]" /> Back
                to Profile
              </Link>
            </Button>
          </motion.div>
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardContent className="space-y-4 pt-6">
          <motion.div variants={itemVariants} className="space-y-4">
            <BigCalendar
              localizer={localizer}
              defaultView="month"
              views={["month"]}
              date={currentViewDate}
              onNavigate={handleNavigate}
              selectable={true}
              onSelectSlot={handleSelectSlot}
              style={{ height: 500 }}
              min={new Date()} // Prevent past dates
              dayPropGetter={dayPropGetter}
              events={[]} // No events needed
            />
            <div className="space-y-2">
              <Label
                htmlFor="breakDuration"
                className="text-black dark:text-white"
              >
                Break Duration Between Slots
              </Label>
              <Select
                value={breakDuration.toString()}
                onValueChange={(value) => setBreakDuration(Number(value))}
              >
                <SelectTrigger className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white">
                  <SelectValue placeholder="Select break duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Minutes</SelectItem>
                  <SelectItem value="60">1 Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {allSlots.map((time) => (
                <div key={time} className="flex items-center space-x-2">
                  <Checkbox
                    id={time}
                    checked={selectedSlots.includes(time)}
                    onCheckedChange={() => toggleSlot(time)}
                    disabled={
                      !isSlotValidWithBreak(
                        time,
                        selectedSlots,
                        breakDuration
                      ) && !selectedSlots.includes(time)
                    }
                  />
                  <Label htmlFor={time}>{time}</Label>
                </div>
              ))}
            </div>
            <Button
              onClick={handleSubmitAvailability}
              className="bg-[#F3CFC6] hover:bg-[#C4C4C4] text-black dark:text-white rounded-full"
            >
              Save Availability
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ManageAvailabilityPage;
