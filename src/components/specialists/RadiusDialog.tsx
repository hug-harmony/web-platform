// components/RadiusDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import dynamic from "next/dynamic";

const DynamicMap = dynamic(() => import("./DynamicMap"), { ssr: false });

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLat?: number;
  currentLng?: number;
  tempRadius: number;
  tempUnit: "km" | "miles";
  onTempRadiusChange: (v: number) => void;
  //   onTempUnitChange: (v: "km" | "miles") => void;
  onApply: () => void;
}

const radiusOptions = [1, 5, 10, 25, 50, 100];

export function RadiusDialog({
  open,
  onOpenChange,
  currentLat,
  currentLng,
  tempRadius,
  tempUnit,
  onTempRadiusChange,

  onApply,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Search Radius</DialogTitle>
          <DialogDescription>
            Choose a radius to filter professionals near your location.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="h-64 rounded-lg overflow-hidden">
            {currentLat && currentLng ? (
              <DynamicMap
                lat={currentLat}
                lng={currentLng}
                radiusMeters={
                  tempUnit === "km" ? tempRadius * 1000 : tempRadius * 1609.34
                }
              />
            ) : (
              <p className="text-center text-gray-500">
                Location not available
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Radius</Label>
            <Select
              value={tempRadius.toString()}
              onValueChange={(v) => onTempRadiusChange(parseInt(v))}
            >
              <SelectTrigger className="border-[#F3CFC6]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map((o) => (
                  <SelectItem key={o} value={o.toString()}>
                    {o} {tempUnit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={onApply}
            className="bg-[#F3CFC6] text-black hover:bg-[#F3CFC6]/80"
          >
            Apply Filter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
