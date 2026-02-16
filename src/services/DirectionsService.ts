export interface RouteStep {
    instruction: string;
    maneuver: {
        type: string;
        modifier?: string;
    };
    distance: number;
}

export interface DirectionsResponse {
    routes: {
        geometry: any;
        legs: {
            steps: {
                maneuver: {
                    instruction: string;
                    type: string;
                    modifier?: string;
                };
                distance: number;
            }[];
        }[];
    }[];
}

export const fetchDirections = async (coordinates: [number, number][]): Promise<any> => {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!token) throw new Error('Mapbox token is missing');

    // Mapbox Directions API has a limit of 25 waypoints.
    // We sample the coordinates to stay within this limit while preserving the route shape.
    let sampledCoords = coordinates;
    if (coordinates.length > 25) {
        const step = Math.ceil((coordinates.length - 2) / 23); // Keep start and end, plus 23 internal points
        sampledCoords = [
            coordinates[0],
            ...coordinates.slice(1, -1).filter((_, i) => i % step === 0),
            coordinates[coordinates.length - 1]
        ].slice(0, 25);
    }

    const coordsString = sampledCoords.map(c => c.join(',')).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/cycling/${coordsString}?steps=true&geometries=geojson&access_token=${token}&language=ja&voice_instructions=true&banner_instructions=true&voice_units=metric`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch directions');
    }

    return await response.json();
};

export const getStepIcon = (type: string, modifier?: string): string => {
    switch (type) {
        case 'depart': return '🏁';
        case 'arrive': return '📍';
        case 'turn':
            if (modifier?.includes('right')) return '↪️';
            if (modifier?.includes('left')) return '↩️';
            return '⬆️';
        case 'straight': return '⬆️';
        case 'roundabout': return '🔄';
        default: return '🚲';
    }
};
