export interface POI {
    id: number;
    lat: number;
    lon: number;
    name: string;
    type: 'restaurant' | 'cafe' | 'toilet' | 'tourism' | 'convenience' | 'historic' | 'parking';
    tags: any;
}

export async function fetchPOIs(bounds: { south: number, west: number, north: number, east: number }): Promise<POI[]> {
    const query = `
        [out:json][timeout:25];
        (
          node["amenity"="restaurant"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          node["amenity"="cafe"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          node["amenity"="toilets"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          node["tourism"~"information|attraction|viewpoint"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          node["historic"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          node["amenity"="place_of_worship"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          node["shop"="convenience"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          node["amenity"~"parking|bicycle_parking"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          
          way["historic"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          way["tourism"~"attraction"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          way["amenity"="place_of_worship"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        );
        out center;
    `;

    const url = 'https://overpass-api.de/api/interpreter';

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: query
        });

        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.statusText}`);
        }

        const data = await response.json();
        const pois: POI[] = [];

        data.elements.forEach((element: any) => {
            const tags = element.tags;
            if (!tags) return;

            let type: POI['type'] = 'tourism';

            if (tags.amenity === 'restaurant') type = 'restaurant';
            else if (tags.amenity === 'cafe') type = 'cafe';
            else if (tags.amenity === 'toilets') type = 'toilet';
            else if (tags.shop === 'convenience') type = 'convenience';
            else if (tags.historic || tags.amenity === 'place_of_worship') type = 'historic';
            else if (tags.amenity === 'parking' || tags.amenity === 'bicycle_parking') type = 'parking';
            else if (tags.tourism) type = 'tourism';

            // Name resolution
            let name = tags.name || tags['name:ja'] || tags['name:en'];

            // Fallback names for certain types
            if (!name) {
                if (type === 'toilet') name = '公衆トイレ';
                else if (type === 'parking') name = '駐車場';
                else if (type === 'historic' && tags.amenity === 'place_of_worship') {
                    if (tags.religion === 'shinto') name = '神社';
                    else if (tags.religion === 'buddhist') name = '寺院';
                    else name = '礼拝所';
                }
            }

            // Skip unnamed items except those with fallbacks
            if (!name) return;

            pois.push({
                id: element.id,
                lat: element.type === 'node' ? element.lat : element.center.lat,
                lon: element.type === 'node' ? element.lon : element.center.lon,
                name: name,
                type: type,
                tags: tags
            });
        });

        return pois;
    } catch (error) {
        console.error('Failed to fetch POIs:', error);
        return [];
    }
}
