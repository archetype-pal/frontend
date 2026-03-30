'use client';

import * as React from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CITY_COORDS: Record<string, [number, number]> = {
  Edinburgh: [55.9533, -3.1883],
  Durham: [54.7753, -1.5849],
  London: [51.5074, -0.1278],
};

type SearchMapViewProps = {
  cityDistribution?: Record<string, number>;
  onSelectCity: (city: string) => void;
};

function markerIcon(count: number, maxCount: number) {
  const ratio = Math.max(0.4, Math.min(1, maxCount > 0 ? count / maxCount : 0.4));
  const size = Math.round(24 + ratio * 18);
  return L.divIcon({
    className: 'city-cluster-icon',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:rgba(30,64,175,0.85);color:white;display:flex;align-items:center;justify-content:center;
      border:2px solid rgba(255,255,255,0.95);font-size:11px;font-weight:700;
      box-shadow:0 4px 10px rgba(0,0,0,0.22);
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function SearchMapView({ cityDistribution = {}, onSelectCity }: SearchMapViewProps) {
  const entries = React.useMemo(
    () =>
      Object.entries(cityDistribution)
        .filter(([city]) => CITY_COORDS[city] != null)
        .sort((a, b) => b[1] - a[1]),
    [cityDistribution]
  );
  const maxCount = React.useMemo(
    () => entries.reduce((max, [, count]) => Math.max(max, count), 0),
    [entries]
  );

  if (entries.length === 0) {
    return (
      <section className="rounded-lg border bg-white p-6">
        <h3 className="text-sm font-semibold">Repository Map</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No repository city data for this selection.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-white p-3 md:p-4">
      <h3 className="text-sm font-semibold mb-3">Repository Map</h3>
      <div className="h-[340px] w-full overflow-hidden rounded-md border">
        <MapContainer center={[54.8, -2.0]} zoom={6} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {entries.map(([city, count]) => (
            <Marker key={city} position={CITY_COORDS[city]} icon={markerIcon(count, maxCount)}>
              <Popup>
                <div className="space-y-2">
                  <p className="font-medium">{city}</p>
                  <p className="text-xs text-muted-foreground">{count.toLocaleString()} results</p>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => onSelectCity(city)}
                  >
                    Filter to this city
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {entries.map(([city, count]) => (
          <button
            key={city}
            type="button"
            className="rounded-full border bg-background px-3 py-1 text-xs hover:bg-muted"
            onClick={() => onSelectCity(city)}
          >
            {city} ({count.toLocaleString()})
          </button>
        ))}
      </div>
    </section>
  );
}
