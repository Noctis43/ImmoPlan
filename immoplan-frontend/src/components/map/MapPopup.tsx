import { Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import type { Annonce } from '../annonces/AnnonceCard';

interface MapPopupProps {
  annonce: Annonce;
}

export function MapPopup({ annonce }: MapPopupProps) {
  const photo = annonce.annonce_photos?.[0];
  return (
    <Popup>
      <Link to={`/annonces/${annonce.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', minWidth: 180 }}>
        {photo && (
          <img src={photo.thumbnail_url ?? photo.cloudinary_url} alt={annonce.titre} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }} />
        )}
        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{annonce.titre}</div>
        <div style={{ color: '#F5A623', fontWeight: 700, marginTop: 2 }}>
          {Number(annonce.prix).toLocaleString('fr-MG')} Ar
        </div>
      </Link>
    </Popup>
  );
}
