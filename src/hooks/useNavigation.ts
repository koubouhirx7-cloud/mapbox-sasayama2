import { useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { playWarningChime, playTurnChime, playOffRouteAlert } from '../utils/audio';

interface NavigationState {
    currentStep: any | null;
    nextStep: any | null;
    distanceToNext: number;
    currentInstruction: string | null;
    isNavigating: boolean;
    isOffRoute: boolean;
}

export const useNavigation = (routeSteps: any[], isVoiceEnabled: boolean = true) => {
    const [state, setState] = useState<NavigationState>({
        currentStep: null,
        nextStep: null,
        distanceToNext: Infinity,
        currentInstruction: null,
        isNavigating: false,
        isOffRoute: false,
    });

    const lastUserLocation = useRef<{ lat: number, lng: number, timestamp: number } | null>(null);
    const announcedStagesRef = useRef<Record<number, Set<number>>>({}); // { stepIndex: Set(50, 10) }
    const lastOffRouteTimeRef = useRef<number>(0);
    const speedRef = useRef<number>(0); // km/h

    const updateLocation = (lat: number, lng: number) => {
        if (!state.isNavigating || !routeSteps || routeSteps.length === 0) return;

        const now = Date.now();
        const userLoc = new mapboxgl.LngLat(lng, lat);

        // Calculate speed (rough estimation)
        if (lastUserLocation.current) {
            const prevLoc = new mapboxgl.LngLat(lastUserLocation.current.lng, lastUserLocation.current.lat);
            const dist = userLoc.distanceTo(prevLoc); // meters
            const timeDiff = (now - lastUserLocation.current.timestamp) / 1000; // seconds
            if (timeDiff > 0) {
                const currentSpeedMps = dist / timeDiff;
                const currentSpeedKmh = currentSpeedMps * 3.6;
                // Simple low-pass filter for speed
                speedRef.current = (speedRef.current * 0.7) + (currentSpeedKmh * 0.3);
            }
        }
        lastUserLocation.current = { lat, lng, timestamp: now };

        // Search window to pick current step (same as before)
        let nearestStepIndex = -1;
        let minDistance = Infinity;
        let lastPassedIndex = Object.keys(announcedStagesRef.current).reduce((max, idx) => Math.max(max, parseInt(idx)), -1);
        let searchStartIndex = Math.max(0, lastPassedIndex);
        let searchEndIndex = Math.min(routeSteps.length, searchStartIndex + 10);

        for (let i = searchStartIndex; i < searchEndIndex; i++) {
            const stepLoc = new mapboxgl.LngLat(
                routeSteps[i].maneuver.location[0],
                routeSteps[i].maneuver.location[1]
            );
            const dist = userLoc.distanceTo(stepLoc);

            if (dist < minDistance) {
                minDistance = dist;
                nearestStepIndex = i;
            }
        }

        // Off-Route Detection (25m Threshold for stability)
        const isOffRoute = minDistance > 25;
        if (isOffRoute && now - lastOffRouteTimeRef.current > 10000) { // Every 10s
            playOffRouteAlert();
            lastOffRouteTimeRef.current = now;
        }

        if (nearestStepIndex !== -1) {
            const step = routeSteps[nearestStepIndex];
            const nextStep = routeSteps[nearestStepIndex + 1] || null;

            // Specific Sound Triggers (50m, 10m)
            if (nextStep) {
                const nextStepLoc = new mapboxgl.LngLat(
                    nextStep.maneuver.location[0],
                    nextStep.maneuver.location[1]
                );
                const distToTurn = userLoc.distanceTo(nextStepLoc);

                if (!announcedStagesRef.current[nearestStepIndex + 1]) {
                    announcedStagesRef.current[nearestStepIndex + 1] = new Set();
                }
                const stages = announcedStagesRef.current[nearestStepIndex + 1];

                // Stage 1: 50m warning (1 beep)
                if (distToTurn <= 55 && distToTurn > 30 && !stages.has(50)) {
                    playWarningChime();
                    stages.add(50);
                    console.log('[Nav] 50m Beep for step', nearestStepIndex + 1);
                }
                // Stage 2: 10m immediate (2 beeps)
                if (distToTurn <= 15 && distToTurn > 0 && !stages.has(10)) {
                    playTurnChime();
                    stages.add(10);
                    console.log('[Nav] 10m Double Beep for step', nearestStepIndex + 1);
                }
            }

            setState(prev => ({
                ...prev,
                currentStep: step,
                nextStep: nextStep,
                distanceToNext: minDistance,
                currentInstruction: step.maneuver.instruction,
                isOffRoute
            }));
        }
    };

    const startNavigation = () => {
        console.log("Starting Navigation");
        announcedStagesRef.current = {};
        setState(prev => ({ ...prev, isNavigating: true, isOffRoute: false }));
    };

    const stopNavigation = () => {
        console.log("Stopping Navigation");
        setState(prev => ({ ...prev, isNavigating: false, currentStep: null, isOffRoute: false }));
    };

    return {
        ...state,
        updateLocation,
        startNavigation,
        stopNavigation,
        currentSpeed: speedRef.current
    };
};
