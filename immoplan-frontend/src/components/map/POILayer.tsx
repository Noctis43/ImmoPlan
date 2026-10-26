import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export type POICategory = 'ecole' | 'hopital' | 'marche' | 'transport' | 'restaurant' | 'banque' | 'pharmacie' | 'eglise' | 'mosque' | 'parc' | 'supermarche' | 'autre';

const CATEGORY_COLORS: Record<POICategory, string> = {
  ecole: '#4D9FFF',
  hopital: '#FF4D4D',
  marche: '#22C55E',
  transport: '#F59E0B',
  restaurant: '#F97316',
  banque: '#8B5CF6',
  pharmacie: '#EC4899',
  eglise: '#A78BFA',
  mosque: '#22D3EE',
  parc: '#34D399',
  supermarche: '#FBBF24',
  autre: '#9CA3AF',
};

const CATEGORY_LABELS: Record<POICategory, string> = {
  ecole: 'École',
  hopital: 'Hôpital',
  marche: 'Marché',
  transport: 'Transport',
  restaurant: 'Restaurant',
  banque: 'Banque',
  pharmacie: 'Pharmacie',
  eglise: 'Église',
  mosque: 'Mosquée',
  parc: 'Parc',
  supermarche: 'Supermarché',
  autre: 'Autre',
};

function makePOIIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;background:${color};border-radius:50%;border:2px solid rgba(0,0,0,0.4);box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

export interface POI {
  id: number;
  nom: string;
  categorie: POICategory;
  adresse?: string;
  distance_m?: number;
  lat?: number;
  lng?: number;
}

interface POILayerProps {
  pois: POI[];
  visibleCategories?: POICategory[];
}

export function POILayer({ pois, visibleCategories }: POILayerProps) {
  const filtered = visibleCategories
    ? pois.filter((p) => visibleCategories.includes(p.categorie))
    : pois;

  return (
    <>
      {filtered.map((poi) => {
        if (!poi.lat || !poi.lng) return null;
        const color = CATEGORY_COLORS[poi.categorie];
        return (
          <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={makePOIIcon(color)}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{poi.nom}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 99, background: color + '22', color, fontSize: '0.72rem', fontWeight: 600, marginBottom: 4 }}>
                  {CATEGORY_LABELS[poi.categorie]}
                </div>
                {poi.adresse && <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{poi.adresse}</div>}
                {poi.distance_m != null && (
                  <div style={{ fontSize: '0.75rem', marginTop: 4, color: '#F5A623', fontWeight: 600 }}>
                    {poi.distance_m < 1000 ? `${Math.round(poi.distance_m)} m` : `${(poi.distance_m / 1000).toFixed(1)} km`}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export { CATEGORY_LABELS, CATEGORY_COLORS };
