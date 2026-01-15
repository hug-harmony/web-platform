/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/admin/professionals/InteractiveUSMap.tsx

"use client";

import { useState, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import { Icon, LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, DollarSign, Users } from "lucide-react";
import Link from "next/link";

interface LocationData {
  state: string;
  stateAbbr: string;
  city: string;
  latitude: number;
  longitude: number;
  count: number;
  professionals: {
    id: string;
    name: string;
    image: string | null;
    rating: number | null;
    rate: number | null;
    sessions: number;
  }[];
}

interface InteractiveUSMapProps {
  locationData: LocationData[];
  onStateClick?: (state: string) => void;
}

// Fix for default marker icons in Leaflet with Next.js
if (typeof window !== "undefined") {
  delete (Icon.Default.prototype as any)._getIconUrl;
  Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

// Component to adjust map bounds to show all markers
function MapBounds({ locationData }: { locationData: LocationData[] }) {
  const map = useMap();

  useMemo(() => {
    if (locationData.length > 0) {
      const bounds = locationData.map(
        (loc) => [loc.latitude, loc.longitude] as LatLngTuple
      );
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
      }
    } else {
      // Default to US center if no data
      map.setView([39.8283, -98.5795], 4);
    }
  }, [locationData, map]);

  return null;
}

export function InteractiveUSMap({
  locationData,
  onStateClick,
}: InteractiveUSMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(
    null
  );

  // Calculate bubble sizes based on count
  const maxCount = useMemo(() => {
    return Math.max(...locationData.map((d) => d.count), 1);
  }, [locationData]);

  const getBubbleRadius = (count: number) => {
    const minSize = 8;
    const maxSize = 30;
    return minSize + (count / maxCount) * (maxSize - minSize);
  };

  const getBubbleColor = (count: number) => {
    if (count >= 10) return "#F3CFC6";
    if (count >= 5) return "#e9bfb5";
    return "#d4a69c";
  };

  const handleMarkerClick = (location: LocationData) => {
    setSelectedLocation(location);
    setDialogOpen(true);
  };

  // Default center to US
  const center: LatLngTuple = [39.8283, -98.5795];

  return (
    <div className="relative w-full h-[400px] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
      {locationData.length > 0 ? (
        <MapContainer
          center={center}
          zoom={4}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
          scrollWheelZoom={false}
          className="rounded-lg"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBounds locationData={locationData} />

          {/* Markers for each location */}
          {locationData.map((location, index) => {
            const radius = getBubbleRadius(location.count);
            const color = getBubbleColor(location.count);
            const position: LatLngTuple = [
              location.latitude,
              location.longitude,
            ];

            return (
              <CircleMarker
                key={`${location.state}-${location.city}-${index}`}
                center={position}
                radius={radius}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.8,
                  color: "#fff",
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => handleMarkerClick(location),
                  mouseover: () => setHoveredLocation(location),
                  mouseout: () => setHoveredLocation(null),
                }}
                className="cursor-pointer transition-all duration-200 hover:opacity-100"
              >
                <Popup>
                  <div className="p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-[#F3CFC6]" />
                      <span className="font-semibold text-sm">
                        {location.city}, {location.stateAbbr}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium text-[#F3CFC6]">
                        {location.count}
                      </span>{" "}
                      professional{location.count !== 1 ? "s" : ""}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Click for details
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-gray-500">
          No location data available
        </div>
      )}

      {/* Custom tooltip on hover */}
      {hoveredLocation && (
        <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-[#F3CFC6]" />
            <span className="font-semibold text-sm">
              {hoveredLocation.city}, {hoveredLocation.stateAbbr}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-medium text-[#F3CFC6]">
              {hoveredLocation.count}
            </span>{" "}
            professional{hoveredLocation.count !== 1 ? "s" : ""}
          </div>
          <div className="text-xs text-gray-400 mt-1">Click for details</div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-xs">
        <p className="font-medium mb-2">Professionals</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#d4a69c" }}
            />
            <span>1-4</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: "#e9bfb5" }}
            />
            <span>5-9</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: "#F3CFC6" }}
            />
            <span>10+</span>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#F3CFC6]" />
              {selectedLocation?.city}, {selectedLocation?.state}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <Badge variant="secondary" className="bg-[#F3CFC6]/20">
                <Users className="h-3 w-3 mr-1" />
                {selectedLocation?.count} Professional
                {selectedLocation?.count !== 1 ? "s" : ""}
              </Badge>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {selectedLocation?.professionals.map((pro) => (
                  <div
                    key={pro.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-[#F3CFC6]">
                        <AvatarImage
                          src={
                            pro.image || "/assets/images/avatar-placeholder.png"
                          }
                        />
                        <AvatarFallback className="bg-[#F3CFC6] text-black">
                          {pro.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{pro.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {pro.rating && (
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {pro.rating.toFixed(1)}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5">
                            <Users className="h-3 w-3" />
                            {pro.sessions} sessions
                          </span>
                          {pro.rate && (
                            <span className="flex items-center gap-0.5">
                              <DollarSign className="h-3 w-3" />
                              {pro.rate}/hr
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/dashboard/professionals/${pro.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
