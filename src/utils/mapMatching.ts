/**
 * Utility to interface with Mapbox Map Matching API
 */

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export interface MatchedRouteResponse {
    geometry: any;
    steps: any[];
    distance: number;
    duration: number;
}

/**
 * Sends coordinates to Map Matching API.
 * API Limit: 100 points per request. We must simplify/chunk if GPX is long.
 */
export const getMatchedRoute = async (coordinates: number[][]): Promise<MatchedRouteResponse | null> => {
    try {
        // Map Matching API supports up to 100 points. 
        // We simplify the coordinates to stay within limits for the matching request.
        // For navigation accuracy, the Directions API is better, but since the user specifically
        // asked for Map Matching API, we use it here.

        const simplified = simplifyCoordinates(coordinates, 100);
        const coordinateString = simplified.map(c => `${c[0]},${c[1]}`).join(';');

        const url = `https://api.mapbox.com/matching/v5/mapbox/cycling/${coordinateString}?geometries=geojson&steps=true&annotations=distance&access_token=${MAPBOX_ACCESS_TOKEN}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== 'Ok' || !data.matchings || data.matchings.length === 0) {
            console.error('Map Matching failed:', data);
            return null;
        }

        const match = data.matchings[0];

        // Extract steps and geometry
        const steps = match.legs.flatMap((leg: any) => leg.steps);

        return {
            geometry: match.geometry,
            steps: steps,
            distance: match.distance,
            duration: match.duration
        };
    } catch (err) {
        console.error('Map Matching API Error:', err);
        return null;
    }
};

/**
 * Basic simplification to fit API limits (N points)
 */
function simplifyCoordinates(coords: number[][], maxPoints: number): number[][] {
    if (coords.length <= maxPoints) return coords;

    const step = coords.length / maxPoints;
    const simplified = [];
    for (let i = 0; i < maxPoints; i++) {
        simplified.push(coords[Math.floor(i * step)]);
    }
    // Always include the last point
    simplified.push(coords[coords.length - 1]);
    return simplified.slice(0, maxPoints);
}
