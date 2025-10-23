// components/DynamicMap.tsx
import { MapContainer, TileLayer, Circle } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  lat: number;
  lng: number;
  radiusMeters: number;
}

export default function DynamicMap({ lat, lng, radiusMeters }: Props) {
  const center: LatLngExpression = [lat, lng];
  return (
    <MapContainer
      center={center}
      zoom={10}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle center={center} radius={radiusMeters} />
    </MapContainer>
  );
}
