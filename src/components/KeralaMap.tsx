import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Provider } from '../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';

export interface TrackingRoute {
  providerLat: number;
  providerLng: number;
  customerLat: number;
  customerLng: number;
  providerLabel: string;
  customerLabel: string;
}

interface KeralaMapProps {
  providers: Array<Provider & { distanceKm?: number }>;
  centerLat: number;
  centerLng: number;
  radiusKm?: number;
  heightClass?: string;
  trackingRoute?: TrackingRoute | null;
}

export const KeralaMap: React.FC<KeralaMapProps> = ({
  providers,
  centerLat,
  centerLng,
  radiusKm,
  heightClass = 'h-[420px]',
  trackingRoute = null,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const { navigate } = useApp();

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: [centerLat, centerLng],
        zoom: 11,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(mapRef.current);
    } else {
      mapRef.current.setView([centerLat, centerLng], 11);
    }

    const map = mapRef.current;
    // Clear previous markers, circles, and polylines
    map.eachLayer((layer) => {
      if (
        layer instanceof L.CircleMarker ||
        layer instanceof L.Circle ||
        layer instanceof L.Polyline
      ) {
        map.removeLayer(layer);
      }
    });

    if (trackingRoute) {
      const bounds: L.LatLngTuple[] = [
        [trackingRoute.providerLat, trackingRoute.providerLng],
        [trackingRoute.customerLat, trackingRoute.customerLng],
      ];

      L.polyline(bounds, {
        color: '#6D28D9',
        weight: 3.5,
        dashArray: '6 8',
        opacity: 0.9,
      }).addTo(map);

      const provMarker = L.circleMarker([trackingRoute.providerLat, trackingRoute.providerLng], {
        radius: 10,
        color: '#FFFFFF',
        weight: 2.5,
        fillColor: '#6D28D9',
        fillOpacity: 1,
      }).addTo(map);
      const provPopup = document.createElement('div');
      provPopup.style.cssText = 'font-size:12px;font-weight:700;color:#6D28D9;';
      provPopup.textContent = trackingRoute.providerLabel;
      provMarker.bindPopup(provPopup).openPopup();

      const custMarker = L.circleMarker([trackingRoute.customerLat, trackingRoute.customerLng], {
        radius: 10,
        color: '#0B1221',
        weight: 2.5,
        fillColor: '#06B6D4',
        fillOpacity: 1,
      }).addTo(map);
      const custPopup = document.createElement('div');
      custPopup.style.cssText = 'font-size:12px;font-weight:700;color:#0F172A;';
      custPopup.textContent = trackingRoute.customerLabel;
      custMarker.bindPopup(custPopup);

      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
      return;
    }

    // Selected user/search center marker
    L.circleMarker([centerLat, centerLng], {
      radius: 8,
      color: '#0B1221',
      fillColor: '#06B6D4',
      fillOpacity: 0.95,
      weight: 2,
    })
      .addTo(map)
      .bindPopup('<strong>Selected Search Area</strong>');

    if (radiusKm && radiusKm > 0) {
      L.circle([centerLat, centerLng], {
        radius: radiusKm * 1000,
        color: '#6D28D9',
        weight: 1.2,
        fillColor: '#6D28D9',
        fillOpacity: 0.07,
      }).addTo(map);
    }

    const bounds: L.LatLngTuple[] = [[centerLat, centerLng]];

    providers.forEach((p) => {
      bounds.push([p.lat, p.lng]);
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 9,
        color: '#FFFFFF',
        weight: 2,
        fillColor: '#6D28D9',
        fillOpacity: 0.95,
      }).addTo(map);

      const popupEl = document.createElement('div');
      popupEl.className = 'text-xs space-y-1 min-w-[180px]';

      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-weight:700;color:#0F172A;font-size:13px;';
      nameEl.textContent = p.name;

      const titleEl = document.createElement('div');
      titleEl.style.cssText = 'color:#475569;';
      titleEl.textContent = p.title;

      const priceEl = document.createElement('div');
      priceEl.style.cssText = 'color:#6D28D9;font-weight:600;';
      priceEl.textContent = `Starts ₹${p.startingPrice} · ★ ${p.rating.toFixed(1)}`;

      const locEl = document.createElement('div');
      locEl.style.cssText = 'color:#475569;';
      locEl.textContent = `${p.locality}, ${p.town} (Radius ${p.serviceRadiusKm} km)`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'View Profile';
      btn.style.cssText =
        'margin-top:6px;background:#6D28D9;color:#fff;border:none;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:600;cursor:pointer;width:100%;';
      btn.onclick = () => navigate({ page: 'provider-profile', id: p.id });

      popupEl.append(nameEl, titleEl, priceEl, locEl, btn);
      marker.bindPopup(popupEl);
    });

    if (providers.length > 0) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12 });
    }
  }, [providers, centerLat, centerLng, radiusKm, trackingRoute, navigate]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
      <div ref={containerRef} className={`w-full ${heightClass}`} />
      <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#475569]">
        {trackingRoute ? (
          <>
            <span>Violet pin: Provider live position · Cyan pin: Customer destination</span>
            <span>OpenStreetMap live booking route view</span>
          </>
        ) : (
          <>
            <span>Showing {providers.length} provider markers across Kerala</span>
            <span>Click any violet marker to inspect starting price and open profile</span>
          </>
        )}
      </div>
    </div>
  );
};
