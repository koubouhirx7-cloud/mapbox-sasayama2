export interface Spot {
    id: string;
    name: string;
    category: 'sightseeing' | 'cafe' | 'experience';
    coordinates: [number, number]; // [lng, lat]
    googleMapsUrl: string;
    description: string;
}

export const spots: Spot[] = [
    {
        id: 'sasayama-castle',
        name: '篠山城跡 (大書院)',
        category: 'sightseeing',
        coordinates: [135.2177341, 35.07324795],
        googleMapsUrl: 'https://www.google.com/maps/place/Sasayama+Castle+Oshoin/@35.07324795,135.2177341',
        description: '徳川家康の命により築城された名城。復元された大書院は木造建築として国内最大級の規模を誇ります。'
    },
    {
        id: 'kawaramachi-merchant',
        name: '河原町妻入商家群',
        category: 'sightseeing',
        coordinates: [135.224722, 35.071667],
        googleMapsUrl: 'https://www.google.com/maps/place/Kawaramachi+Merchant+District/@35.071667,135.224722',
        description: '江戸時代の面影を残す歴史的な町並み。妻入り様式の商家が立ち並び、国の重要伝統的建造物群保存地区に選定されています。'
    },
    {
        id: 'tachikui-pottery',
        name: '丹波伝統工芸公園 陶の郷',
        category: 'experience',
        coordinates: [135.131611, 34.981028],
        googleMapsUrl: 'https://www.google.com/maps/place/Tamba+Traditional+Craft+Park+Sue+no+Sato/@34.981028,135.131611',
        description: '日本六古窯の一つ、丹波焼をテーマにした公園。陶芸体験や窯元巡りの拠点として最適です。'
    },
    {
        id: 'sasayama-tamamizu',
        name: '篠山玉水ゆり園',
        category: 'sightseeing',
        coordinates: [135.218022, 35.082748],
        googleMapsUrl: 'https://www.google.com/maps/place/Sasayama+Tamamizu+Lily+Garden/@35.082748,135.218022',
        description: '6月から7月にかけて色とりどりのユリとアジサイが咲き誇る美しい庭園。篠山城の井戸水の水源地でもあります。'
    },
];
