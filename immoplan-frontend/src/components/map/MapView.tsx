import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onBoundsChange?: (bounds: { sw_lat: number; sw_lng: number; ne_lat: number; ne_lng: number }) => void;
}

function BoundsListener({ onBoundsChange }: { onBoundsChange?: MapViewProps['onBoundsChange'] }) {
  const map = useMap();
  const cbRef = useRef(onBoundsChange);
  cbRef.current = onBoundsChange;

  useEffect(() => {
    const handler = () => {
      if (!cbRef.current) return;
      const b = map.getBounds();
      cbRef.current({
        sw_lat: b.getSouth(),
        sw_lng: b.getWest(),
        ne_lat: b.getNorth(),
        ne_lng: b.getEast(),
      });
    };

    // Trigger immediately on mount to fetch default area's ads
    handler();

    map.on('moveend', handler);
    map.on('zoomend', handler);
    return () => { map.off('moveend', handler); map.off('zoomend', handler); };
  }, [map]);

  return null;
}

// Madagascar default center
const DEFAULT_CENTER: [number, number] = [-18.9137, 47.5361];

export function MapView({ center = DEFAULT_CENTER, zoom = 12, style, children, onBoundsChange }: MapViewProps) {
  const [isSatellite, setIsSatellite] = useState(false);
  const tileUrl = isSatellite
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className={`map-view ${isSatellite ? 'map-view--satellite' : 'map-view--plan'}`} style={{ width: '100%', height: '100%', ...style }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-xl)' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer attribution="" url={tileUrl} />
        {onBoundsChange && <BoundsListener onBoundsChange={onBoundsChange} />}
        {children}
      </MapContainer>
      <button
        type="button"
        className="map-view__layer-toggle"
        onClick={() => setIsSatellite((v) => !v)}
        aria-label={isSatellite ? 'Basculer vers la carte plan' : 'Basculer vers la carte satellite'}
      >
        {isSatellite ? 'Plan' : 'Satellite'}
      </button>
    </div>
  );
}
