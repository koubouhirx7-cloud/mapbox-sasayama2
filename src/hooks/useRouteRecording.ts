import { useState, useRef, useCallback } from 'react';

interface RoutePoint {
    lng: number;
    lat: number;
    timestamp: number;
}

interface SavedRoute {
    id: string;
    name: string;
    path: RoutePoint[];
    distance: number; // meters
    duration: number; // ms
    avgSpeed: number; // km/h
    createdAt: number;
}

interface RecordingStats {
    distance: number;
    duration: number;
    avgSpeed: number;
    pointCount: number;
}

const STORAGE_KEY = 'saved_routes';

const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const useRouteRecording = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordedPath, setRecordedPath] = useState<RoutePoint[]>([]);
    const [stats, setStats] = useState<RecordingStats>({ distance: 0, duration: 0, avgSpeed: 0, pointCount: 0 });
    const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch { return []; }
    });

    const totalDistanceRef = useRef(0);
    const startTimeRef = useRef(0);
    const pausedDurationRef = useRef(0);
    const pauseStartRef = useRef(0);
    const lastPointRef = useRef<RoutePoint | null>(null);

    const startRecording = useCallback(() => {
        setRecordedPath([]);
        totalDistanceRef.current = 0;
        startTimeRef.current = Date.now();
        pausedDurationRef.current = 0;
        lastPointRef.current = null;
        setIsRecording(true);
        setIsPaused(false);
        setStats({ distance: 0, duration: 0, avgSpeed: 0, pointCount: 0 });
    }, []);

    const pauseRecording = useCallback(() => {
        setIsPaused(true);
        pauseStartRef.current = Date.now();
    }, []);

    const resumeRecording = useCallback(() => {
        setIsPaused(false);
        pausedDurationRef.current += Date.now() - pauseStartRef.current;
    }, []);

    const addPoint = useCallback((lat: number, lng: number) => {
        if (!isRecording || isPaused) return;

        const point: RoutePoint = { lng, lat, timestamp: Date.now() };

        // Filter very close points (< 3m) to avoid GPS noise
        if (lastPointRef.current) {
            const dist = haversineDistance(lastPointRef.current.lat, lastPointRef.current.lng, lat, lng);
            if (dist < 3) return;
            totalDistanceRef.current += dist;
        }

        lastPointRef.current = point;

        setRecordedPath(prev => {
            const newPath = [...prev, point];
            const elapsed = Date.now() - startTimeRef.current - pausedDurationRef.current;
            const avgSpeed = elapsed > 0 ? (totalDistanceRef.current / 1000) / (elapsed / 3600000) : 0;

            setStats({
                distance: totalDistanceRef.current,
                duration: elapsed,
                avgSpeed,
                pointCount: newPath.length,
            });

            return newPath;
        });
    }, [isRecording, isPaused]);

    const stopRecording = useCallback((name?: string) => {
        const elapsed = Date.now() - startTimeRef.current - pausedDurationRef.current;
        const avgSpeed = elapsed > 0 ? (totalDistanceRef.current / 1000) / (elapsed / 3600000) : 0;

        const route: SavedRoute = {
            id: `route_${Date.now()}`,
            name: name || `ライド ${new Date().toLocaleDateString('ja-JP')}`,
            path: recordedPath,
            distance: totalDistanceRef.current,
            duration: elapsed,
            avgSpeed,
            createdAt: Date.now(),
        };

        const updated = [route, ...savedRoutes].slice(0, 20); // Keep max 20
        setSavedRoutes(updated);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* storage full */ }

        setIsRecording(false);
        setIsPaused(false);
        setRecordedPath([]);

        return route;
    }, [recordedPath, savedRoutes]);

    const deleteRoute = useCallback((id: string) => {
        const updated = savedRoutes.filter(r => r.id !== id);
        setSavedRoutes(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }, [savedRoutes]);

    const getRouteAsGeoJSON = useCallback((path: RoutePoint[]) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: {
            type: 'LineString' as const,
            coordinates: path.map(p => [p.lng, p.lat]),
        },
    }), []);

    return {
        isRecording,
        isPaused,
        recordedPath,
        stats,
        savedRoutes,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        addPoint,
        deleteRoute,
        getRouteAsGeoJSON,
    };
};
