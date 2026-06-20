export interface Coordinates {
    lng: number;
    lat: number;
}

export interface BBox {
    swLng: number;
    swLat: number;
    neLng: number;
    neLat: number;
}

const POINT_REGEX = /POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i;
const PAREN_COORD_REGEX = /\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/;

export function parsePointFromText(val: unknown, isQuartier = false): Coordinates | null {
    if ( val == null) return null;

    if (typeof val === 'object') {
        const o = val as Record<string, unknown>;

        if ('x' in o && 'y' in o) {
            return {
                lng: Number(o.x),
                lat: Number(o.y)
            };
        }

        if ('lng' in o && 'lat' in o) {
            return {
                lng: Number(o.lng),
                lat: Number(o.lat)
            };
        }
    }

    if (typeof val !== 'string') return null;

    const trimmed = val.trim();
    if(!trimmed) return null;

    const pointMatch = trimmed.match(POINT_REGEX);
    if (pointMatch) {
        return {
            lng: parseFloat(pointMatch[1]),
            lat: parseFloat(pointMatch[2])
        };
    }

    const parenMatch = trimmed.match(PAREN_COORD_REGEX);
    if (parenMatch) {
        return {
            lng: parseFloat(parenMatch[1]),
            lat: parseFloat(parenMatch[2])
        };
    }

    if (trimmed.includes(',')) {
        const parts = trimmed.split(',');

        if (parts.length === 2) {
            const first = parseFloat(parts[0]);
            const second = parseFloat(parts[1]);

            if (!Number.isNaN(first) && !Number.isNaN(second)) {
                if (isQuartier) {
                    return {
                        lat: first,
                        lng: second
                    };
                }
                if (first < 0 && second >0) {
                    return {
                        lng: first,
                        lat: second
                    };
                }
            }
        }
    }
    return null;
}

export function harversineDistance(a: Coordinates, b: Coordinates): number {
    const R = 6371;
    const toRoad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRoad(b.lat - a.lat);
    const dLng = toRoad(b.lng - a.lng);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h = sinDLat * sinDLat + Math.cos(toRoad(a.lat)) * Math.cos(toRoad(b.lat)) * sinDLng * sinDLng;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

    return R * c;
}

export function harversineDistanceMeters(a: Coordinates, b: Coordinates): number {
    return harversineDistance(a, b) * 1000;
}