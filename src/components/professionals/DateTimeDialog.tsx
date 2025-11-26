// components/professionals/DateTimeDialog.tsx
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
import { cn } from "@/lib/utils";

const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
};

const timePresets = [
  {
    label: "Morning",
    subLabel: "6AM-12PM",
    range: [360, 720] as [number, number],
  },
  {
    label: "Afternoon",
    subLabel: "12PM-6PM",
    range: [720, 1080] as [number, number],
  },
  {
    label: "Evening",
    subLabel: "6PM-10PM",
    range: [1080, 1320] as [number, number],
  },
  {
    label: "All Day",
    subLabel: "12AM-11:30PM",
    range: [0, 1410] as [number, number],
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  onApply: () => void;
  timeRange: [number, number];
  setTimeRange: (range: [number, number]) => void;
}

export function DateTimeDialog({
  open,
  onOpenChange,
  selectedDate,
  onDateSelect,
  onApply,
  timeRange,
  setTimeRange,
}: Props) {
  const startTime = minutesToTime(timeRange[0]);
  const endTime = minutesToTime(timeRange[1]);

  const handleClearDate = () => {
    onDateSelect(undefined);
    setTimeRange([0, 1410]);
  };

  const isPresetActive = (preset: (typeof timePresets)[0]) => {
    return timeRange[0] === preset.range[0] && timeRange[1] === preset.range[1];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Date & Time Range</DialogTitle>
          <DialogDescription>
            Choose a date and time window to filter professionals by
            availability
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Calendar */}
          <div className="border rounded-lg p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateSelect}
              className="mx-auto"
              aria-label="Select a date"
            />
          </div>

          {/* Time Presets */}
          <div className="space-y-3">
            <Label>Quick Time Selection</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {timePresets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setTimeRange(preset.range)}
                  className={cn(
                    "flex flex-col h-auto py-2 transition-colors",
                    isPresetActive(preset) &&
                      "bg-[#F3CFC6] text-black border-[#F3CFC6] hover:bg-[#F3CFC6]/80"
                  )}
                  aria-pressed={isPresetActive(preset)}
                >
                  <span className="font-medium">{preset.label}</span>
                  <span className="text-[10px] opacity-70">
                    {preset.subLabel}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Time Range Slider */}
          <div className="space-y-4">
            <Label>Custom Time Range</Label>
            <div className="px-2">
              <Slider
                value={timeRange}
                onValueChange={(value) =>
                  setTimeRange(value as [number, number])
                }
                min={0}
                max={1410}
                step={30}
                className="w-full"
                aria-label="Select time range"
              />
            </div>
            <div className="flex justify-between text-sm font-medium text-muted-foreground">
              <span>{startTime}</span>
              <span className="text-xs">to</span>
              <span>{endTime}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Drag the handles to set your preferred time window
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={handleClearDate}
            className="text-destructive hover:text-destructive"
          >
            Clear Date
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={onApply}
              className="bg-[#F3CFC6] text-black hover:bg-[#F3CFC6]/80"
            >
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
