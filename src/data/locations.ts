import { FeatureCollection } from 'geojson';

export const locationData: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            properties: {
                name: 'ハイランダー（拠点）',
                type: 'base',
                description: '丹波篠山市の里山自転車店。サイクリングの拠点です。'
            },
            geometry: {
                type: 'Point',
                coordinates: [135.164515, 35.062031]
            }
        },
        {
            type: 'Feature',
            properties: {
                name: '味間奥の茶畑',
                type: 'tea_field',
                description: '大国寺周辺に広がる美しい茶畑景観。'
            },
            geometry: {
                type: 'Point',
                coordinates: [135.160397, 35.068165]
            }
        },
        {
            type: 'Feature',
            properties: {
                name: '茶の里会館周辺',
                type: 'tea_field',
                description: '丹波篠山茶の歴史を感じるエリア。'
            },
            geometry: {
                type: 'Point',
                coordinates: [135.148337, 35.064192]
            }
        },
        {
            type: 'Feature',
            properties: {
                name: '味間南の茶畑',
                type: 'tea_field',
                description: 'ハイランダー近くののどかな茶畑。'
            },
            geometry: {
                type: 'Point',
                coordinates: [135.166, 35.063]
            }
        }
    ]
};

export const routeData: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            properties: {
                name: 'おすすめサイクリングルート'
            },
            geometry: {
                type: 'LineString',
                coordinates: [
                    [135.164515, 35.062031], // Highlander
                    [135.166, 35.063],       // Ajima-minami
                    [135.160397, 35.068165], // Ajima-oku
                    [135.148337, 35.064192]  // Cha no Sato
                ]
            }
        }
    ]
};
