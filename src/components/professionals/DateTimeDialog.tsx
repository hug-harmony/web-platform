// components/DateTimeDialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const timeToMinutes = (time: string): number => {
  const [t, period] = time.split(" ");
  const [h, m] = t.split(":").map(Number);
  return (period === "PM" && h !== 12 ? h + 12 : h) * 60 + m;
};

const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | undefined;
  availabilities: Record<string, string[]>;
  onDateSelect: (date: Date | undefined) => void;
  onApply: () => void;
  timeRange: [number, number];
  setTimeRange: (range: [number, number]) => void;
}

export function DateTimeDialog({
  open,
  onOpenChange,
  selectedDate,
  availabilities,
  onDateSelect,
  onApply,
  timeRange,
  setTimeRange,
}: Props) {
  const dateKey = selectedDate?.toISOString().split("T")[0];
  const availableSlots = dateKey ? availabilities[dateKey] || [] : [];
  const availableMins = availableSlots.map(timeToMinutes);

  const minAvailable = availableMins.length ? Math.min(...availableMins) : 0;
  const maxAvailable = availableMins.length ? Math.max(...availableMins) : 1440;

  const startTime = minutesToTime(timeRange[0]);
  const endTime = minutesToTime(timeRange[1]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Date & Time Range</DialogTitle>
          <DialogDescription>Filter by availability window</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="border rounded-lg p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateSelect}
              className="mx-auto"
            />
          </div>

          <div className="space-y-4">
            <Label>Available Time Range</Label>
            {selectedDate && availableMins.length === 0 ? (
              <p className="text-sm text-red-500">
                No availability on this date
              </p>
            ) : (
              <>
                <div className="px-2">
                  <Slider
                    value={timeRange}
                    onValueChange={setTimeRange}
                    min={minAvailable}
                    max={maxAvailable}
                    step={30}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>{startTime}</span>
                  <span>—</span>
                  <span>{endTime}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onApply}
            disabled={!selectedDate || availableMins.length === 0}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
