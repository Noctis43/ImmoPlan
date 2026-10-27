import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import type { Annonce } from '../annonces/AnnonceCard';

const amberIcon = L.divIcon({
  className: '',
  html: `<div style="width:32px;height:40px;position:relative">
    <svg viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24s16-14 16-24C32 7.163 24.837 0 16 0z" fill="#F5A623"/>
      <circle cx="16" cy="16" r="7" fill="#0A0A0F"/>
    </svg>
  </div>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -42],
});

interface MapMarkerProps {
  annonce: Annonce;
  lat: number;
  lng: number;
}

export function MapMarker({ annonce, lat, lng }: MapMarkerProps) {
  const photo = annonce.annonce_photos?.[0];

  return (
    <Marker position={[lat, lng]} icon={amberIcon}>
      <Popup>
        <Link
          to={`/annonces/${annonce.id}`}
          style={{ display: 'block', minWidth: 200, textDecoration: 'none', color: 'inherit' }}
        >
          {photo && (
            <img
              src={photo.thumbnail_url ?? photo.cloudinary_url}
              alt={annonce.titre}
              style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
            />
          )}
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{annonce.titre}</div>
          <div style={{ color: '#F5A623', fontWeight: 700, fontSize: '1rem' }}>
            {Number(annonce.prix).toLocaleString('fr-MG')} Ar
            {annonce.prix_unite ? `/${annonce.prix_unite}` : ''}
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.7 }}>
            {annonce.surface_m2} m² · {annonce.type_bien}
          </div>
        </Link>
      </Popup>
    </Marker>
  );
}
