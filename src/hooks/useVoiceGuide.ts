import { useRef, useCallback, useState } from 'react';
import { locationData } from '../data/locations';
import { useTextToSpeech } from './useTextToSpeech';

const ANNOUNCE_RADIUS = 200; // meters
const COOLDOWN = 60000; // Don't re-announce for 60 seconds

const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getGuideMessage = (spot: any): string => {
    const name = spot.name || spot.title || '不明なスポット';
    const category = spot.category || spot.type || '';

    const messages: Record<string, string> = {
        'shrine': `まもなく ${name} に到着しますよ。歴史ある神社ですな。ぜひ参拝していってください。`,
        'temple': `この先に ${name} がございます。静かで美しいお寺ですよ。`,
        'cafe': `おや、${name} が近いですな。一息入れるには最高の場所ですよ。`,
        'restaurant': `${name} が見えてきましたな。地元の味を楽しんでください。`,
        'viewpoint': `ここは見逃せません！${name}、絶景ポイントですよ。`,
        'park': `${name} が近づいてきましたな。自然豊かな癒しのスポットです。`,
        'onsen': `お疲れの体に最高ですよ。${name}、温泉でリフレッシュしましょう。`,
        'museum': `${name} がございます。丹波篠山の文化に触れてみてください。`,
    };

    return messages[category] || `この先に ${name} がございますよ。立ち寄ってみてはいかがでしょう。`;
};

export const useVoiceGuide = () => {
    const [isEnabled, setIsEnabled] = useState(false);
    const { speak, isSpeaking } = useTextToSpeech();
    const announcedRef = useRef<Map<string, number>>(new Map()); // spotKey -> timestamp

    const updatePosition = useCallback((lat: number, lng: number) => {
        if (!isEnabled || isSpeaking) return;

        const now = Date.now();

        for (const feature of locationData.features) {
            if (!feature.geometry || feature.geometry.type !== 'Point') continue;
            const coords = (feature.geometry as any).coordinates as [number, number];
            const [spotLng, spotLat] = coords;
            const dist = haversineDistance(lat, lng, spotLat, spotLng);

            if (dist <= ANNOUNCE_RADIUS) {
                const key = `${spotLat}_${spotLng}`;
                const lastAnnounced = announcedRef.current.get(key) || 0;

                if (now - lastAnnounced > COOLDOWN) {
                    const spot = {
                        name: feature.properties?.name || '不明なスポット',
                        category: feature.properties?.type || '',
                    };
                    const message = getGuideMessage(spot);
                    console.log(`[VoiceGuide] Announcing: ${spot.name} (${Math.round(dist)}m)`);
                    speak(message);
                    announcedRef.current.set(key, now);
                    break;
                }
            }
        }
    }, [isEnabled, isSpeaking, speak]);


    const toggleVoiceGuide = useCallback(() => {
        setIsEnabled(prev => !prev);
    }, []);

    const resetAnnouncements = useCallback(() => {
        announcedRef.current.clear();
    }, []);

    return {
        isVoiceGuideEnabled: isEnabled,
        isSpeaking,
        updatePosition,
        toggleVoiceGuide,
        resetAnnouncements,
    };
};
