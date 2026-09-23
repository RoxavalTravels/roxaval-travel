import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SupportedLanguageCode } from '../../i18n';

interface RouteStop {
  dayNumber: number;
  name: string;
  lat: number;
  lng: number;
}

const numberedIcon = (n: number) =>
  L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:#1a7a5e;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);color:#fff;font-family:sans-serif;font-size:12px;font-weight:700;">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

// Fits the map's viewport to every stop once the stops are known, since
// MapContainer only accepts a fixed initial `bounds` prop on first render.
// `sizeKey` re-runs this whenever the container's actual size mode changes
// (screen vs print), not just when the stops themselves change.
function FitBounds({ stops, sizeKey }: { stops: RouteStop[]; sizeKey: string }) {
  const map = useMap();

  const fit = React.useCallback(() => {
    if (stops.length === 0) return;
    map.invalidateSize();
    if (stops.length === 1) {
      map.setView([stops[0].lat, stops[0].lng], 9);
      return;
    }
    map.fitBounds(stops.map((s) => [s.lat, s.lng] as [number, number]), { padding: [30, 30] });
  }, [stops, map]);

  React.useEffect(() => {
    fit();
  }, [fit, sizeKey]);

  // Fallback for the browser's own print menu / Ctrl+P, which RouteMap's
  // 'roxaval:prepare-print' listener (see below) never sees a click for.
  // Same fit() call, just with no guaranteed lead time before the snapshot.
  React.useEffect(() => {
    window.addEventListener('beforeprint', fit);
    return () => window.removeEventListener('beforeprint', fit);
  }, [fit]);

  return null;
}

type MapDest = { name: string; mapLocation?: { lat?: number; lng?: number } };

// Almost every Sri Lanka tour flies in and out through Colombo, so the route
// always starts and ends there regardless of which hotels the itinerary
// actually books — it's the airport/arrival-departure point, not a day stop.
const COLOMBO = { name: 'Colombo', lat: 6.9271, lng: 79.8612 };

const SCREEN_HEIGHT = '26rem';
const PRINT_HEIGHT = '14rem';

/**
 * Numbered day-by-day route on a Sri Lanka map — built from each day's
 * destination coordinates (Destination.mapLocation), deduplicated so a
 * multi-day stay in one place doesn't stack repeat markers. Bookended with
 * Colombo at both ends (arrival and departure) and renumbered 1..N as
 * sequential stops, since a multi-night stay already collapses to one
 * marker below — the numbers were never really "day numbers" in practice.
 *
 * A day's own `destinations` array is populated from itinerary_days.
 * destination_ids, which the API currently returns as raw IDs rather than
 * hydrated Destination objects, so it's effectively always empty in
 * practice — same gap the route text above this map already works around
 * by falling back to the day's hotel's destination, which IS a real
 * eager-loaded relation. Mirroring that fallback here is what makes the
 * map actually have coordinates to plot.
 *
 * The print-sized height used to come from a `print:h-56` Tailwind class,
 * switched purely by the browser's own print media query -- but that meant
 * the resize (and the different map tiles it usually needs, fetched over
 * the network) only ever happened right as the browser was about to
 * snapshot the page, with no guaranteed time for those tiles to arrive
 * first. It's driven by JS state instead: the Print button (QuotationView)
 * fires 'roxaval:prepare-print' well before it actually calls
 * window.print(), so the resize — and the tile fetch it triggers — happen
 * during that lead time, not during the snapshot itself.
 */
export function RouteMap({ days, lang }: { days: { dayNumber: number; destinations?: MapDest[]; hotel?: { destination?: MapDest } }[]; lang?: SupportedLanguageCode }) {
  const { t } = useTranslation('quotation');
  const [printSizing, setPrintSizing] = useState(false);

  React.useEffect(() => {
    const onPrepare = () => setPrintSizing(true);
    const onRestore = () => setPrintSizing(false);
    window.addEventListener('roxaval:prepare-print', onPrepare);
    window.addEventListener('afterprint', onRestore);
    return () => {
      window.removeEventListener('roxaval:prepare-print', onPrepare);
      window.removeEventListener('afterprint', onRestore);
    };
  }, []);

  const stops = useMemo(() => {
    const named: { name: string; lat: number; lng: number }[] = [COLOMBO];
    days.forEach((d) => {
      const dest = d.destinations?.[0] || d.hotel?.destination;
      const lat = dest?.mapLocation?.lat;
      const lng = dest?.mapLocation?.lng;
      if (!dest || lat == null || lng == null) return;
      const prev = named[named.length - 1];
      if (prev && prev.name === dest.name) return;
      named.push({ name: dest.name, lat, lng });
    });
    const last = named[named.length - 1];
    if (!last || last.name !== COLOMBO.name) named.push(COLOMBO);
    // A one-stop trip (no real destinations resolved) is just Colombo twice
    // back-to-back — nothing to plot as a route.
    if (named.length <= 2 && named.every((s) => s.name === COLOMBO.name)) return [];
    return named.map((s, i) => ({ dayNumber: i + 1, name: s.name, lat: s.lat, lng: s.lng }));
  }, [days]);

  if (stops.length === 0) return null;

  return (
    <div className="mt-8 border-b border-forest/10 pb-8 print:mt-4 print:break-inside-avoid print:pb-4">
      <p className="font-display text-sm font-semibold text-forest">{t('tripRoute', { lng: lang })}</p>
      <div
        className="mt-3 w-full overflow-hidden rounded-2xl border border-forest/10 print:mt-2"
        style={{ height: printSizing ? PRINT_HEIGHT : SCREEN_HEIGHT }}>

        <MapContainer center={[7.8731, 80.7718]} zoom={7} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
            referrerPolicy="strict-origin-when-cross-origin"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Polyline
            positions={stops.map((s) => [s.lat, s.lng])}
            pathOptions={{ color: '#1a7a5e', weight: 2.5, dashArray: '6 6' }} />
          {stops.map((s, i) =>
            // The route loops back through Colombo, so the first and last
            // markers sit at identical coordinates and stack directly on
            // top of each other — without this, whichever renders last (the
            // "return to Colombo" marker) hides the "1" start marker
            // completely. Keeping the start marker on top still shows the
            // full loop, since the dashed line already runs back to that
            // same point either way.
            <Marker key={i} position={[s.lat, s.lng]} icon={numberedIcon(s.dayNumber)} zIndexOffset={i === 0 ? 1000 : 0} />
          )}
          <FitBounds stops={stops} sizeKey={printSizing ? 'print' : 'screen'} />
        </MapContainer>
      </div>
    </div>
  );
}
