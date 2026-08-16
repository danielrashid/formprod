"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DF_CENTER: [number, number] = [-15.7942, -47.8822];

function iconSelecionado() {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:36px;height:36px;">
      <div style="position:absolute;inset:0;background:#dc2626;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,.4);border:2px solid #fff;"></div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MoveToPosition({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (latitude != null && longitude != null) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 16), {
        animate: true,
      });
    }
  }, [latitude, longitude, map]);
  return null;
}

export default function MapaPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const center: [number, number] =
    latitude != null && longitude != null
      ? [latitude, longitude]
      : DF_CENTER;

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={center}
        zoom={latitude != null ? 16 : 11}
        className="z-0 h-56 w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        <MoveToPosition latitude={latitude} longitude={longitude} />
        {latitude != null && longitude != null && (
          <Marker position={[latitude, longitude]} icon={iconSelecionado()} />
        )}
      </MapContainer>
    </div>
  );
}
