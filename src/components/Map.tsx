import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { locationData } from '../data/locations';
import { fetchDirections } from '../services/DirectionsService';
import GpxRouteLayer from './GpxRouteLayer';
import courseData from '../data/course_sasayama.json';
import { explorationRoutes } from '../data/explorationRoutes';
import { fetchPOIs, POI } from '../services/OverpassService';
import { fetchGeminiResponse } from '../services/GeminiService';
import { useBatteryAwareness } from '../hooks/useBatteryAwareness';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const HIGHLANDER_COORDS: [number, number] = [135.164515, 35.062031];

interface PhotoEntry {
    id: string;
    lat: number;
    lng: number;
    timestamp: number;
    thumbnail: string;
}

interface RoutePoint {
    lng: number;
    lat: number;
    timestamp: number;
}

interface MapProps {
    onStepsChange?: (steps: any[]) => void;
    onProximityChange?: (step: any, distance: number | null) => void;
    onUserLocationChange?: (lat: number, lng: number) => void;
    activeRoute: 'mock-loop-west' | string;
    simulatedLocation?: { lat: number, lng: number, bearing?: number } | null;
    onRouteLoaded?: (route: any) => void;
    selectionTimestamp?: number;
    speed?: number;
    isNavigating?: boolean;
    recordedPath?: RoutePoint[];
    isRecording?: boolean;
    photos?: PhotoEntry[];
    onPhotoDelete?: (id: string) => void;
}

// Helper to create a circle GeoJSON
const createGeoJSONCircle = (center: [number, number], radiusInKm: number, points = 64) => {
    const coords = { latitude: center[1], longitude: center[0] };
    const checkPoint = (i: number) => {
        return [
            coords.longitude + (radiusInKm / 111.32) * Math.cos(2 * Math.PI * i / points),
            coords.latitude + (radiusInKm / 111.32) * Math.sin(2 * Math.PI * i / points)
        ] as [number, number];
    };
    const ret: [number, number][] = [];
    for (let i = 0; i < points; i++) {
        ret.push(checkPoint(i));
    }
    ret.push(ret[0]);
    return ret;
};

const Map: React.FC<MapProps> = ({
    onStepsChange,
    onProximityChange,
    onUserLocationChange,
    activeRoute,
    simulatedLocation,
    onRouteLoaded,
    selectionTimestamp,
    speed = 0,
    isNavigating = false,
    recordedPath = [],
    isRecording = false,
    photos = [],
    onPhotoDelete,
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    // markersRef removed
    // markersRef removed
    const poiMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const photoMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [pois, setPois] = useState<POI[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({
        restaurant: true,
        cafe: true,
        toilet: true,
        tourism: true,
        convenience: true,
        historic: true,
        parking: true
    });

    // Combined State
    const [is3D, setIs3D] = useState(() => localStorage.getItem('map_is3D') === 'true');
    const [isHistorical, setIsHistorical] = useState(() => localStorage.getItem('map_isHistorical') === 'true');
    const [mapStyle, setMapStyle] = useState<'terrain' | 'satellite'>('terrain');

    // Battery / Eco Mode
    const { isEcoMode, level, charging } = useBatteryAwareness();
    // Network Status
    const isOnline = useNetworkStatus();

    // Force 2D Mode when Eco Mode is active
    useEffect(() => {
        if (isEcoMode && is3D) {
            console.log('Eco Mode activated: Switching to 2D');
            setIs3D(false);
            if (mapRef.current) {
                mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 2000 });
            }
        }
    }, [isEcoMode, is3D]);

    // Tracking State
    const [isTracking, setIsTracking] = useState(false);
    const isTrackingRef = useRef(false);

    // Sync isTracking ref
    useEffect(() => {
        isTrackingRef.current = isTracking;
    }, [isTracking]);

    // Enable tracking when navigation starts
    useEffect(() => {
        if (isNavigating) {
            setIsTracking(true);
        } else {
            setIsTracking(false);
        }
    }, [isNavigating]);

    // Effects to save state
    useEffect(() => localStorage.setItem('map_is3D', is3D.toString()), [is3D]);
    useEffect(() => localStorage.setItem('map_isHistorical', isHistorical.toString()), [isHistorical]);

    // === Route Recording Line ===
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        const sourceId = 'recorded-route';
        const layerId = 'recorded-route-line';

        const geojson: any = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: recordedPath.map(p => [p.lng, p.lat]),
            },
        };

        if (map.getSource(sourceId)) {
            (map.getSource(sourceId) as any).setData(geojson);
        } else {
            map.addSource(sourceId, { type: 'geojson', data: geojson });
            map.addLayer({
                id: layerId,
                type: 'line',
                source: sourceId,
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#ef4444',
                    'line-width': 4,
                    'line-dasharray': [2, 1],
                    'line-opacity': 0.9,
                },
            });
        }
    }, [recordedPath]);

    // === Photo Markers ===
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Remove old markers
        photoMarkersRef.current.forEach(m => m.remove());
        photoMarkersRef.current = [];

        photos.forEach(photo => {
            const el = document.createElement('div');
            el.style.cssText = 'font-size:24px;cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));transition:transform 0.2s;';
            el.textContent = '📷';
            el.onmouseenter = () => { el.style.transform = 'scale(1.3)'; };
            el.onmouseleave = () => { el.style.transform = 'scale(1)'; };

            const dateStr = new Date(photo.timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            const popup = new mapboxgl.Popup({ offset: 25, maxWidth: '220px' })
                .setHTML(`
                    <div style="text-align:center;font-family:sans-serif;">
                        <img src="${photo.thumbnail}" style="width:100%;border-radius:8px;margin-bottom:6px;" />
                        <p style="font-size:11px;color:#666;margin:0 0 6px;">${dateStr}</p>
                        <button id="delete-photo-${photo.id}" style="font-size:11px;color:#ef4444;background:none;border:1px solid #ef4444;padding:2px 10px;border-radius:6px;cursor:pointer;">削除</button>
                    </div>
                `);

            popup.on('open', () => {
                setTimeout(() => {
                    const btn = document.getElementById(`delete-photo-${photo.id}`);
                    if (btn && onPhotoDelete) {
                        btn.onclick = () => {
                            onPhotoDelete(photo.id);
                            popup.remove();
                        };
                    }
                }, 50);
            });

            const marker = new mapboxgl.Marker({ element: el })
                .setLngLat([photo.lng, photo.lat])
                .setPopup(popup)
                .addTo(map);

            photoMarkersRef.current.push(marker);
        });
    }, [photos, onPhotoDelete]);


    // Refs for state access inside callbacks
    const isNavigatingRef = useRef(isNavigating);
    const lastUserLocationRef = useRef<{ lng: number, lat: number, heading: number } | null>(null);
    const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

    // Sync isNavigating ref and update marker
    useEffect(() => {
        isNavigatingRef.current = isNavigating;
        updateUserMarker();
    }, [isNavigating]);

    // Function to update the custom user marker
    const updateUserMarker = () => {
        if (!mapRef.current) return;
        const location = lastUserLocationRef.current;

        if (isNavigatingRef.current && location) {
            // Show/Update Arrow Marker
            if (!userMarkerRef.current) {
                const el = document.createElement('div');
                el.className = 'user-marker-arrow';
                el.innerHTML = `
                <svg width="40" height="40" viewBox="0 0 100 100" style="display:block;">
                    <filter id="shadow-user" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
                    </filter>
                    <circle cx="50" cy="50" r="20" fill="#007cbf" stroke="white" stroke-width="2" style="opacity: 0.3"/>
                    <path d="M50 15 L85 85 L50 70 L15 85 Z" fill="#FF8C00" stroke="white" stroke-width="4" filter="url(#shadow-user)" />
                </svg>
                `;
                el.style.width = '40px';
                el.style.height = '40px';

                userMarkerRef.current = new mapboxgl.Marker({
                    element: el,
                    rotationAlignment: 'map',
                    pitchAlignment: 'map'
                })
                    .setLngLat([location.lng, location.lat])
                    .setRotation(location.heading)
                    .addTo(mapRef.current);
            } else {
                userMarkerRef.current.setLngLat([location.lng, location.lat]);
                userMarkerRef.current.setRotation(location.heading);
            }
        } else {
            // Hide/Remove Arrow Marker
            if (userMarkerRef.current) {
                userMarkerRef.current.remove();
                userMarkerRef.current = null;
            }
        }
    };

    // Refs for callbacks to avoid stale closures in Mapbox event listeners
    const onUserLocationChangeRef = useRef(onUserLocationChange);
    const onStepsChangeRef = useRef(onStepsChange);
    const onRouteLoadedRef = useRef(onRouteLoaded);

    // Track user heading
    const currentHeadingRef = useRef<number>(0);

    // Track initial zoom for simulation
    const hasInitialZoomedRef = useRef(false);
    // Track previous navigation state to detect STOP
    const prevIsNavigatingRef = useRef(isNavigating);
    const hasSnappedToNavRef = useRef(false);

    // Reset snap ref when route changes
    useEffect(() => {
        hasSnappedToNavRef.current = false;
        hasInitialZoomedRef.current = false;
    }, [activeRoute, selectionTimestamp]);

    useEffect(() => {
        onUserLocationChangeRef.current = onUserLocationChange;
        onStepsChangeRef.current = onStepsChange;
        onRouteLoadedRef.current = onRouteLoaded;
    }, [onUserLocationChange, onStepsChange, onRouteLoaded]);

    // Areas to be rendered as polygons
    const areas = explorationRoutes.filter(r => r.category === 'area');

    useEffect(() => {
        const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

        if (!token || token === 'pk.YOUR_ACTUAL_TOKEN_HERE') {
            setError('Mapbox access token is missing or invalid.');
            return;
        }

        mapboxgl.accessToken = token;

        if (mapContainerRef.current && !mapRef.current) {
            try {
                mapRef.current = new mapboxgl.Map({
                    container: mapContainerRef.current,
                    style: 'mapbox://styles/mapbox/outdoors-v12', // 1. Outdoors Style
                    center: HIGHLANDER_COORDS,
                    zoom: 13,
                    pitch: 0,
                    bearing: 0
                });

                mapRef.current.on('style.load', () => {
                    const map = mapRef.current!;

                    // 1.5 Add Historical Source (GSI 1974-1978: "gazo1")
                    // ort_old10 (1960s) also lacked data. gazo1 (1974-78) has reliable nationwide coverage.
                    if (!map.getSource('historical-tiles')) {
                        map.addSource('historical-tiles', {
                            type: 'raster',
                            tiles: ['https://cyberjapandata.gsi.go.jp/xyz/gazo1/{z}/{x}/{y}.jpg'],
                            tileSize: 256,
                            maxzoom: 17, // Prevents 404 at high zoom
                            attribution: '国土地理院 (1974-1978)'
                        });
                    }

                    // Add Historical Layer (Initially hidden or visible based on state)
                    if (!map.getLayer('historical-layer')) {
                        map.addLayer({
                            id: 'historical-layer',
                            type: 'raster',
                            source: 'historical-tiles',
                            paint: {
                                'raster-opacity': 0.7, // Increased from 0.4 for better visibility
                                'raster-fade-duration': 300
                            },
                            layout: {
                                visibility: 'none' // Start hidden
                            }
                        });
                    }

                    // 2. Localize Labels & White Halo
                    const layers = map.getStyle()?.layers;
                    if (layers) {
                        layers.forEach((layer) => {
                            if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
                                // Skip road shields (they use 'ref' not 'name')
                                if (layer.id.indexOf('shield') !== -1) return;

                                map.setLayoutProperty(layer.id, 'text-field', ['get', 'name_ja']);
                                map.setPaintProperty(layer.id, 'text-halo-color', '#ffffff');
                                map.setPaintProperty(layer.id, 'text-halo-width', 3);

                                // --- Filter Labels ---
                                // 1. Filter POIs to only show 'historic'
                                if (layer.id.includes('poi-label')) {
                                    map.setFilter(layer.id, ['==', ['get', 'class'], 'historic']);
                                }

                                // 2. Hide specific non-essential layers
                                const hideKeywords = ['medical-label', 'commercial-label', 'industrial-label', 'educational-label'];
                                if (hideKeywords.some(kw => layer.id.includes(kw))) {
                                    map.setLayoutProperty(layer.id, 'visibility', 'none');
                                }
                            }
                        });
                    }

                    // 3. Satellite Layer (below labels)
                    const labelLayerId = layers?.find(l => l.type === 'symbol' && l.layout?.['text-field'])?.id;

                    if (!map.getSource('mapbox-satellite')) {
                        map.addSource('mapbox-satellite', {
                            'type': 'raster',
                            'url': 'mapbox://mapbox.satellite',
                            'tileSize': 256
                        });
                    }

                    if (!map.getLayer('mapbox-satellite-layer')) {
                        map.addLayer({
                            'id': 'mapbox-satellite-layer',
                            'type': 'raster',
                            'source': 'mapbox-satellite',
                            'layout': { 'visibility': 'none' },
                            'paint': { 'raster-opacity': 1 }
                        }, labelLayerId);
                    }

                    // 4. 3D Terrain & Sky Atmosphere (Combined)
                    if (!map.getSource('mapbox-dem')) {
                        map.addSource('mapbox-dem', {
                            'type': 'raster-dem',
                            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                            'tileSize': 512,
                            'maxzoom': 14
                        });
                    }
                    // Use Incoming's exaggeration preference
                    map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 2.2 });

                    // Add Sky Layer
                    if (!map.getLayer('sky')) {
                        map.addLayer({
                            'id': 'sky',
                            'type': 'sky',
                            'paint': {
                                'sky-type': 'atmosphere',
                                'sky-atmosphere-sun': [0.0, 0.0],
                                'sky-atmosphere-sun-intensity': 15
                            }
                        });
                    }

                    // 5. Historical Layer (Meiji Era) - From HEAD
                    if (!map.getSource('gsi-meiji')) {
                        map.addSource('gsi-meiji', {
                            'type': 'raster',
                            'tiles': ['https://cyberjapandata.gsi.go.jp/xyz/200000_1/{z}/{x}/{y}.png'],
                            'tileSize': 256,
                            'attribution': '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>'
                        });
                    }

                    if (!map.getLayer('gsi-meiji-layer')) {
                        map.addLayer({
                            'id': 'gsi-meiji-layer',
                            'type': 'raster',
                            'source': 'gsi-meiji',
                            'paint': {
                                'raster-opacity': [
                                    'interpolate',
                                    ['linear'],
                                    ['zoom'],
                                    10, 0,
                                    13, 0.4,
                                    16, 0.7
                                ],
                                'raster-fade-duration': 300
                            }
                        }, labelLayerId);
                    }
                });

                mapRef.current.on('load', async () => {
                    const map = mapRef.current!;
                    setMapInstance(map);

                    // Add Navigation Controls
                    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
                    const geolocate = new mapboxgl.GeolocateControl({
                        positionOptions: { enableHighAccuracy: true },
                        trackUserLocation: true,
                        showUserHeading: true
                    });
                    map.addControl(geolocate, 'top-right');

                    // Disable tracking on manual interaction
                    const disableTracking = (e: any) => {
                        if (e.originalEvent) {
                            setIsTracking(false);
                            isTrackingRef.current = false;
                        }
                    };
                    map.on('dragstart', disableTracking);
                    map.on('touchstart', disableTracking);
                    map.on('wheel', disableTracking);


                    geolocate.on('geolocate', (position: any) => {
                        const cb = onUserLocationChangeRef.current;
                        if (cb) cb(position.coords.latitude, position.coords.longitude);

                        // Update heading ref & last location
                        const heading = (position.coords.heading !== null && position.coords.heading !== undefined)
                            ? position.coords.heading
                            : 0;

                        currentHeadingRef.current = heading;
                        lastUserLocationRef.current = {
                            lng: position.coords.longitude,
                            lat: position.coords.latitude,
                            heading: heading
                        };

                        // Update marker immediately
                        updateUserMarker();

                        // Follow User Location if Tracking
                        if (isTrackingRef.current) {
                            mapRef.current?.easeTo({
                                center: [position.coords.longitude, position.coords.latitude],
                                duration: 1000,
                                easing: (t) => t // Linear easing for smooth following
                            });
                        }
                    });

                    geolocate.on('error', (e: any) => {
                        console.error('Geolocate error:', e);
                        // User-friendly error alerts
                        if (e.code === 1) { // PERMISSION_DENIED
                            alert('位置情報の利用が許可されていません。\n端末の設定：\n設定 > プライバシー > 位置情報サービス でオンにしてください。\nまた、ブラウザの設定も確認してください。');
                        } else if (e.code === 2) { // POSITION_UNAVAILABLE
                            alert('現在地を取得できませんでした。\n電波の良い場所で再度お試しください。');
                        } else if (e.code === 3) { // TIMEOUT
                            alert('位置情報の取得がタイムアウトしました。');
                        } else {
                            alert(`位置情報エラー: ${e.message}`);
                        }
                    });

                    // Auto-start Geolocation disabled to prevent permission dialog on load
                    // Users can manually enable location tracking via the geolocation button
                    setTimeout(() => {
                        // console.log('Triggering auto-geolocation...');
                        // geolocate.trigger(); // DISABLED: Prevents automatic location permission request

                        // Check for specific launch modes
                        const searchParams = new URLSearchParams(window.location.search);
                        if (searchParams.get('mode') === 'ride') {
                            map.setPitch(60); // Tilt for 3D/Heading up view
                            setIs3D(true);    // Sync UI state
                        }
                    }, 1000);

                    // 4. Area Overlays (Dynamic)
                    areas.forEach(area => {
                        const sourceId = `area-${area.id}`;
                        const polygon = createGeoJSONCircle(area.startPoint, 1.2); // Balanced radius for areas

                        map.addSource(sourceId, {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: { title: area.name },
                                geometry: { type: 'Polygon', coordinates: [polygon] }
                            }
                        });

                        map.addLayer({
                            id: `${sourceId}-fill`,
                            type: 'fill',
                            source: sourceId,
                            paint: {
                                'fill-color': area.color || '#2D5A27',
                                'fill-opacity': 0.2
                            }
                        });
                    });

                    // Interactions (Popup & FlyTo)
                    let hoverPopup: mapboxgl.Popup | null = null;

                    const showPopup = (e: any) => {
                        const description = e.features[0].properties.title;

                        // If popup doesn't exist, create it
                        if (!hoverPopup) {
                            hoverPopup = new mapboxgl.Popup({
                                closeButton: false,
                                closeOnClick: false
                            });
                        }

                        // Update styling and content
                        hoverPopup
                            .setLngLat(e.lngLat)
                            .setHTML(`<div class="px-2 py-1 text-sm font-bold text-satoyama-forest">${description}</div>`)
                            .addTo(map);
                    };

                    const areaLayerIds = areas.map(area => `area-${area.id}-fill`);

                    areaLayerIds.forEach(layerId => {
                        map.on('mousemove', layerId, (e) => {
                            map.getCanvas().style.cursor = 'pointer';
                            showPopup(e);
                        });
                        map.on('mouseleave', layerId, () => {
                            map.getCanvas().style.cursor = '';
                            if (hoverPopup) {
                                hoverPopup.remove();
                                hoverPopup = null;
                            }
                        });
                        map.on('click', layerId, (e) => {
                            map.flyTo({ center: e.lngLat, zoom: 15, duration: 1500 });
                        });
                    });
                });


            } catch (e) {
                console.error('Failed to initialize Mapbox:', e);
                setError('Failed to initialize map.');
            }
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    const targetRoute = explorationRoutes.find(r => r.id === activeRoute);

    // Handle Route Changes & Fetch Directions
    useEffect(() => {
        if (!mapInstance || !targetRoute) return;
        const map = mapInstance;

        // Fit bounds to show the entire route
        if (targetRoute.data && targetRoute.category === 'route') {
            const bounds = new mapboxgl.LngLatBounds();
            targetRoute.data.features?.forEach((feature: any) => {
                if (feature.geometry.type === 'LineString') {
                    feature.geometry.coordinates.forEach((coord: [number, number]) => {
                        bounds.extend(coord);
                    });
                }
            });

            if (!bounds.isEmpty()) {
                map.fitBounds(bounds, {
                    padding: { top: 50, bottom: 200, left: 50, right: 50 },
                    duration: 2000
                });
            } else {
                map.flyTo({ center: targetRoute.startPoint, zoom: 14, duration: 2000 });
            }
        } else {
            // Fallback for areas or missing data
            map.flyTo({
                center: targetRoute.startPoint,
                zoom: targetRoute.category === 'area' ? 15 : 14,
                duration: 2000
            });
        }

        // Fetch Turn-by-Turn Directions
        const loadRoute = async () => {
            try {
                if (!targetRoute.data) return;

                const routeFeature = targetRoute.data.features?.find((f: any) => f.geometry.type === 'LineString');
                if (!routeFeature) return;

                const coords = routeFeature.geometry.coordinates;

                // Use Map Matching API for precise snapping and steps as requested
                const matched = await fetchDirections(coords);

                if (matched) {
                    const cb = onStepsChangeRef.current;
                    if (cb) {
                        cb(matched.steps);
                    }
                }
            } catch (err) {
                console.error("Failed to load directions:", err);
            }
        };

        loadRoute();
    }, [activeRoute, targetRoute, mapInstance, selectionTimestamp]);

    const simulationMarkerRef = useRef<mapboxgl.Marker | null>(null);

    // Navigation View Lock (North Up + 45deg Tilt)
    // Triggered when speed is detected OR navigation starts
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        const isMoving = speed > 3; // Threshold: 3km/h
        const shouldSnap = isMoving || (isNavigating && !hasSnappedToNavRef.current);

        if (shouldSnap) {
            // Force North Up and 45deg Tilt while moving, OR Heading Up if available
            // Use current heading if we are navigating and moving
            const targetBearing = (isNavigating && speed > 0 && currentHeadingRef.current)
                ? currentHeadingRef.current
                : 0;

            const options: any = {
                bearing: targetBearing,
                pitch: 45,
                duration: 500
            };

            // Force Zoom 16.5 (~200m) only on the VERY FIRST detection of movement or nav start
            if (!hasSnappedToNavRef.current) {
                options.zoom = 16.5;
                hasSnappedToNavRef.current = true;

                // Smart Center Logic: User Location -> Course Start
                if (lastUserLocationRef.current) {
                    options.center = [lastUserLocationRef.current.lng, lastUserLocationRef.current.lat];
                    console.log('[Map] Nav Start: Snapping to USER LOCATION');
                } else {
                    const currentRoute = explorationRoutes.find(r => r.id === activeRoute);
                    if (currentRoute?.startPoint) {
                        options.center = currentRoute.startPoint;
                        console.log('[Map] Nav Start: User Location unknown, snapping to COURSE START');
                    }
                }

                console.log(`[Map] ${isNavigating ? 'Nav Start' : 'Movement'} detected. Snapping to Nav View (Zoom 16.5, North Up, 45 Tilt)`);
            }

            if (!simulatedLocation) {
                map.easeTo(options);
            }
        }

        // REVERT VIEW ON STOP
        // If navigation was active and is now stopped
        if (prevIsNavigatingRef.current === true && isNavigating === false) {
            console.log('[Map] Navigation STOP detected. Reverting to Overview Mode.');
            hasSnappedToNavRef.current = false; // Reset for next run

            // Birds-eye view (Pitch 0, Bearing 0)
            map.easeTo({
                pitch: 0,
                bearing: 0,
                duration: 1000
            });

            // If a route/area is active, refit bounds to show the whole thing
            const targetRoute = explorationRoutes.find(r => r.id === activeRoute);
            if (targetRoute) {
                if (targetRoute.data && targetRoute.category === 'route') {
                    const bounds = new mapboxgl.LngLatBounds();
                    targetRoute.data.features?.forEach((feature: any) => {
                        if (feature.geometry.type === 'LineString') {
                            feature.geometry.coordinates.forEach((coord: [number, number]) => {
                                bounds.extend(coord);
                            });
                        }
                    });

                    if (!bounds.isEmpty()) {
                        map.fitBounds(bounds, {
                            padding: { top: 50, bottom: 200, left: 50, right: 50 },
                            duration: 1500
                        });
                    }
                } else {
                    map.flyTo({ center: targetRoute.startPoint, zoom: 15, duration: 1500 });
                }
            }
        }

        prevIsNavigatingRef.current = isNavigating;
    }, [speed, isNavigating, simulatedLocation, activeRoute]);

    // Simulation Marker & Camera Follow
    useEffect(() => {
        if (!mapRef.current) return;

        if (simulatedLocation) {
            if (!simulationMarkerRef.current) {
                const el = document.createElement('div');
                el.className = 'simulation-marker-arrow';
                // Navigation Arrow SVG (Triangle)
                el.innerHTML = `
                <svg width="40" height="40" viewBox="0 0 100 100" style="display:block;">
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
                    </filter>
                    <path d="M50 15 L85 85 L50 70 L15 85 Z" fill="#FF8C00" stroke="white" stroke-width="4" filter="url(#shadow)" />
                </svg>
                `;
                el.style.width = '40px';
                el.style.height = '40px';

                simulationMarkerRef.current = new mapboxgl.Marker({
                    element: el,
                    rotationAlignment: 'map',
                    pitchAlignment: 'map'
                })
                    .setLngLat([simulatedLocation.lng, simulatedLocation.lat])
                    .setRotation(simulatedLocation.bearing || 0)
                    .addTo(mapRef.current);
            } else {
                simulationMarkerRef.current.setLngLat([simulatedLocation.lng, simulatedLocation.lat]);
                if (simulatedLocation.bearing !== undefined) {
                    simulationMarkerRef.current.setRotation(simulatedLocation.bearing);
                }
            }

            // Camera follow with easing
            // Enforce North Up (bearing 0) and 45-degree pitch as per user request
            const cameraOptions: any = {
                center: [simulatedLocation.lng, simulatedLocation.lat],
                pitch: 45,
                bearing: 0,
                duration: 100, // Short duration for smooth continuous update
                easing: (t: number) => t
            };

            if (hasInitialZoomedRef && !hasInitialZoomedRef.current) {
                // Force an immediate snap to North Up, Tilt, and Zoom on the very first frame
                mapRef.current.jumpTo({
                    center: [simulatedLocation.lng, simulatedLocation.lat],
                    bearing: 0,
                    pitch: 45,
                    zoom: 16.5
                });
                hasInitialZoomedRef.current = true;
                hasSnappedToNavRef.current = true; // Sync this ref too
            } else {
                // Continuous smooth follow
                mapRef.current.easeTo(cameraOptions);
            }
        } else {
            if (hasInitialZoomedRef) hasInitialZoomedRef.current = false; // Reset for next run
            if (simulationMarkerRef.current) {
                simulationMarkerRef.current.remove();
                simulationMarkerRef.current = null;
            }
        }
    }, [simulatedLocation]);

    const toggleStyle = () => {
        if (!mapRef.current) return;
        const newStyle = mapStyle === 'terrain' ? 'satellite' : 'terrain';
        setMapStyle(newStyle);

        if (newStyle === 'satellite') {
            mapRef.current.setLayoutProperty('mapbox-satellite-layer', 'visibility', 'visible');

            // Faint historical overlay on satellite imagery (Edo period route simulation)
            if (mapRef.current.getLayer('gsi-meiji-layer')) {
                mapRef.current.setPaintProperty('gsi-meiji-layer', 'raster-opacity', 0.4);
            }
        } else {
            mapRef.current.setLayoutProperty('mapbox-satellite-layer', 'visibility', 'none');

            // Revert to zoom-based opacity for terrain mode
            if (mapRef.current.getLayer('gsi-meiji-layer')) {
                mapRef.current.setPaintProperty('gsi-meiji-layer', 'raster-opacity', [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 0,
                    13, 0.4,
                    16, 0.7
                ]);
            }
        }
    };

    // Handle Overpass POI Search
    const handleSearchArea = async () => {
        if (!mapInstance) return;

        if (pois.length === 0) {
            setIsPanelOpen(true); // Open panel on new search
        }
        setIsSearching(true);
        const bounds = mapInstance.getBounds();
        if (!bounds) {
            setIsSearching(false);
            return;
        }
        const searchBounds = {
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast()
        };

        const newPois = await fetchPOIs(searchBounds);
        setPois(newPois);
        // Reset visibility to all true on new search including new categories
        setVisibleCategories({
            restaurant: true,
            cafe: true,
            toilet: true,
            tourism: true,
            convenience: true,
            historic: true,
            parking: true
        });
        setIsSearching(false);
    };

    // Render POI Markers
    useEffect(() => {
        if (!mapInstance) return;

        // Clear existing POI markers
        poiMarkersRef.current.forEach(marker => marker.remove());
        poiMarkersRef.current = [];

        pois.forEach(poi => {
            // Skip if category is hidden
            if (!visibleCategories[poi.type]) return;

            let color = '#555';
            let icon = '📍';

            switch (poi.type) {
                case 'restaurant': color = '#FF5722'; icon = '🍽️'; break;
                case 'cafe': color = '#795548'; icon = '☕'; break;
                case 'toilet': color = '#03A9F4'; icon = '🚻'; break;
                case 'tourism': color = '#E91E63'; icon = 'ℹ️'; break;
                case 'convenience': color = '#FF9800'; icon = '🏪'; break;
                case 'historic': color = '#795548'; icon = '🏯'; break;
                case 'parking': color = '#607D8B'; icon = '🅿️'; break;
            }

            // Create custom element for emoji marker
            const el = document.createElement('div');
            el.className = 'poi-marker';
            el.innerHTML = `<div style="font-size: 20px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${icon}</div>`;

            const popupContent = `
                <div class="p-3 max-w-[200px] font-sans">
                    <h3 class="text-sm font-bold text-gray-800 mb-1">${poi.name}</h3>
                    <p class="text-xs text-gray-500 mb-1 capitalize">${poi.type}</p>
                    <a href="https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lon}" target="_blank" rel="noopener noreferrer" 
                       class="inline-block w-full text-center bg-blue-600 text-white text-[10px] py-1.5 rounded shadow-sm hover:bg-blue-700 transition-colors mt-1">
                        Googleマップで見る
                    </a>
                </div>
            `;

            const popup = new mapboxgl.Popup({ offset: 25, maxWidth: '250px' })
                .setHTML(popupContent);

            const marker = new mapboxgl.Marker({ element: el })
                .setLngLat([poi.lon, poi.lat])
                .setPopup(popup)
                .addTo(mapInstance);

            poiMarkersRef.current.push(marker);
        });

    }, [pois, mapInstance, visibleCategories]);
    if (error) return <div className="text-red-500 p-4">{error}</div>;

    return (
        <div className="w-full h-full relative">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Style Switcher UI */}
            <div className="absolute top-20 md:top-4 left-4 z-10 flex flex-col gap-2">
                <button
                    onClick={toggleStyle}
                    className="flex items-center gap-2 bg-[#F4F1E8] hover:bg-white text-[#2D5A27] px-3 py-2 rounded-lg shadow-md border border-[#2D5A27]/20 transition-all group"
                    title={mapStyle === 'terrain' ? '衛星写真に切り替え' : '地形図に切り替え'}
                >
                    <div className={`w-10 h-10 rounded-md overflow-hidden border-2 ${mapStyle === 'satellite' ? 'border-[#2D5A27]' : 'border-transparent'}`}>
                        <img
                            src={mapStyle === 'terrain' ? "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/135.164,35.062,12/100x100?access_token=" + mapboxgl.accessToken : "https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/135.164,35.062,12/100x100?access_token=" + mapboxgl.accessToken}
                            alt="style-preview"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col items-start pr-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Style</span>
                        <span className="text-xs font-bold">{mapStyle === 'terrain' ? 'Satellite' : 'Terrain'}</span>
                    </div>
                </button>
            </div>



            {mapInstance && targetRoute?.data && (
                <GpxRouteLayer
                    key={activeRoute}
                    map={mapInstance}
                    isVisible={targetRoute.category === 'route'}
                    onRouteLoaded={onRouteLoaded}
                    routeData={targetRoute.data}
                />
            )}

            {/* AI Guide Button */}
            {/* Old AI Button Removed */}

            {/* AI Panel */}
            {isAiPanelOpen && (
                <div className="absolute top-28 right-14 z-20 bg-white p-4 rounded-xl shadow-2xl w-72 md:w-80 border border-purple-100 animate-fade-in origin-top-right">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 font-outfit">
                            <span className="text-xl">✨</span> SATOYAMA AI
                        </h3>
                        <button onClick={() => setIsAiPanelOpen(false)} className="text-gray-400 hover:text-gray-600">
                            ✕
                        </button>
                    </div>

                    <div className="mb-4 max-h-60 overflow-y-auto bg-gray-50 rounded-lg p-3 text-sm leading-relaxed text-gray-700 min-h-[100px]">
                        {isAiLoading ? (
                            <div className="flex items-center gap-2 text-purple-600 justify-center h-full">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                考えています...
                            </div>
                        ) : (
                            aiResponse ? (
                                <div className="prose prose-sm prose-purple whitespace-pre-wrap">
                                    {aiResponse.split(/(\[.*?\]\s*\(.*?\))/gs).map((part, index) => {
                                        const match = part.match(/\[(.*?)\]\s*\((.*?)\)/s);
                                        if (match) {
                                            const url = match[2].replace(/\s+/g, '');
                                            return (
                                                <a
                                                    key={index}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-md text-xs font-bold transition-all transform active:scale-95 shadow-sm my-1 no-underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {match[1].trim()}
                                                    <svg className="inline-block ml-1" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                                </a>
                                            );
                                        }
                                        return part;
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-4">
                                    場所や歴史について何でも聞いてください。<br />
                                    例: 「丹波篠山の歴史は？」「近くのおすすめランチは？」
                                </p>
                            )
                        )}
                    </div>

                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (!aiPrompt.trim()) return;

                            console.log('AI Request Triggered:', aiPrompt);
                            setIsAiLoading(true);

                            try {
                                const center = mapRef.current?.getCenter();
                                const currentRoute = explorationRoutes.find(r => r.id === activeRoute);

                                let localPois: POI[] = [];
                                if (center) {
                                    console.log('Fetching nearby POIs for AI grounding...');
                                    const lat = center.lat;
                                    const lng = center.lng;
                                    const delta = 0.015;
                                    const searchBounds = {
                                        south: lat - delta,
                                        west: lng - delta,
                                        north: lat + delta,
                                        east: lng + delta
                                    };
                                    localPois = await fetchPOIs(searchBounds);
                                }

                                let context = `利用者は現在、兵庫県丹波篠山市の周辺にいます。 `;
                                if (center) {
                                    context += `地図の中心座標は 北緯 ${center.lat.toFixed(4)}度, 東経 ${center.lng.toFixed(4)}度 です。 `;
                                }
                                if (currentRoute && currentRoute.id !== 'none') {
                                    context += `現在選択中のコースは「${currentRoute.name}」です。 `;
                                }

                                if (localPois.length > 0 && center) {
                                    context += `\n以下のリストは、周辺スポットです。距離が近い順に並んでいます：\n`;

                                    // Sort by distance from center
                                    const sortedPois = [...localPois].map(poi => {
                                        const dist = Math.sqrt(Math.pow(poi.lat - center.lat, 2) + Math.pow(poi.lon - center.lng, 2)) * 111.32; // Approx km
                                        return { ...poi, distance: dist };
                                    }).sort((a, b) => a.distance - b.distance);

                                    sortedPois.slice(0, 20).forEach(poi => {
                                        context += `- ${poi.name}（${poi.type}、約${poi.distance.toFixed(1)}km）\n`;
                                    });
                                }
                                console.log('Sending request to Gemini...');
                                const response = await fetchGeminiResponse(context + "\n\n質問: " + aiPrompt);
                                setAiResponse(response);
                                setAiPrompt('');
                            } catch (err) {
                                console.error('AI Flow Error:', err);
                                setAiResponse('エラーが発生しました。しばらく待ってから再度お試しください。');
                            } finally {
                                setIsAiLoading(false);
                            }
                        }}
                        className="relative"
                    >
                        <input
                            type="text"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="AIに質問する..."
                            className="w-full pl-4 pr-10 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-base"
                        />
                        <button
                            type="submit"
                            disabled={isAiLoading || !aiPrompt.trim() || !isOnline}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </form>
                    {!isOnline && (
                        <p className="text-xs text-red-500 mt-2 text-center">
                            オフラインのためAI機能は利用できません
                        </p>
                    )}
                </div>
            )
            }


            {/* Current Location Button */}
            <button
                onClick={() => {
                    if (lastUserLocationRef.current && mapRef.current) {
                        mapRef.current.flyTo({
                            center: [lastUserLocationRef.current.lng, lastUserLocationRef.current.lat],
                            zoom: 15,
                            pitch: 45,
                            bearing: lastUserLocationRef.current.heading || 0,
                            duration: 1500
                        });
                        // Re-engage snap if navigating
                        if (isNavigating) {
                            hasSnappedToNavRef.current = true;
                        }
                    } else {
                        alert('現在地を取得できませんでした。');
                    }
                    // Enable tracking mode
                    setIsTracking(true);
                }}
                className="absolute top-52 right-3 z-10 bg-white text-satoyama-forest p-2 rounded-full shadow-lg hover:bg-gray-50 flex items-center justify-center transition-all duration-300"
                style={{ width: '40px', height: '40px' }}
                aria-label="Return to Current Location"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="22" y1="12" x2="18" y2="12"></line>
                    <line x1="6" y1="12" x2="2" y2="12"></line>
                    <line x1="12" y1="6" x2="12" y2="2"></line>
                    <line x1="12" y1="22" x2="12" y2="18"></line>
                </svg>
            </button>

            {/* 3D Mode Toggle Button */}
            <button
                onClick={() => {
                    if (isEcoMode) {
                        alert('省電力モード中（電池残量20%以下）のため、3D表示は制限されています。');
                        return;
                    }

                    if (mapRef.current) {
                        const nextState = !is3D;
                        setIs3D(nextState);

                        if (nextState) {
                            // Switch to 3D View
                            mapRef.current.easeTo({
                                pitch: 60,
                                duration: 1000
                            });
                        } else {
                            // Switch to 2D View
                            mapRef.current.easeTo({
                                pitch: 0,
                                bearing: 0, // Reset bearing in 2D for easier orientation
                                duration: 1000
                            });
                        }
                    }
                }}
                className={`absolute top-64 right-3 z-10 p-2 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center font-bold text-xs
                    ${is3D
                        ? 'bg-satoyama-forest text-white ring-2 ring-satoyama-leaf'
                        : isEcoMode
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                style={{ width: '40px', height: '40px' }}
                aria-label="Toggle 3D View"
            >
                {isEcoMode ? 'Eco' : '3D'}
            </button>


            {/* Overpass Search Button */}
            {/* AI Guide Trigger (Replaces Search Button) */}
            <button
                onClick={() => setIsAiPanelOpen(true)}
                disabled={!isOnline}
                className={`absolute top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl transition-all duration-300 flex items-center gap-2 font-bold text-sm
                    ${isOnline
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-105 active:scale-95 animate-pulse-slow'
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    } ring-2 ring-white/50`}
            >
                <span className="text-xl">{isOnline ? '✨' : '📶'}</span>
                {isOnline ? 'AIに聞く' : 'オフライン'}
            </button>

            {/* POI Control Panel (Only visible when POIs are present) */}
            {
                pois.length > 0 && (
                    <div className="absolute top-[60px] left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200 w-48 animate-slide-down">
                        <div className="flex justify-between items-center mb-2 border-b pb-2 cursor-pointer" onClick={() => setIsPanelOpen(!isPanelOpen)}>
                            <h3 className="text-xs font-bold text-gray-700 select-none flex items-center gap-1">
                                検索結果 ({pois.length})
                                <span className={`transition-transform duration-200 ${isPanelOpen ? 'rotate-180' : ''}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </span>
                            </h3>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPois([]);
                                    poiMarkersRef.current.forEach(marker => marker.remove());
                                    poiMarkersRef.current = [];
                                }}
                                className="text-[10px] text-red-500 hover:bg-red-50 px-2 py-0.5 rounded border border-red-100 transition-colors"
                            >
                                クリア
                            </button>
                        </div>

                        {isPanelOpen && (
                            <div className="space-y-2 animate-fade-in max-h-60 overflow-y-auto pr-1">
                                <div className="grid grid-cols-1 gap-1.5">
                                    {Object.entries({
                                        restaurant: { label: '飲食', icon: '🍴' },
                                        cafe: { label: 'カフェ', icon: '☕' },
                                        historic: { label: '歴史・名刹', icon: '🏯' },
                                        tourism: { label: '観光・案内', icon: 'ℹ️' },
                                        convenience: { label: 'コンビニ', icon: '🏪' },
                                        toilet: { label: 'トイレ', icon: '🚻' },
                                        parking: { label: '駐車場', icon: '🅿️' }
                                    }).map(([id, info]) => {
                                        const count = pois.filter(p => p.type === id).length;
                                        if (count === 0) return null;

                                        return (
                                            <label key={id} className="flex items-center justify-between text-[11px] cursor-pointer hover:bg-gray-50 p-1.5 rounded select-none transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={visibleCategories[id]}
                                                        onChange={() => setVisibleCategories(prev => ({ ...prev, [id]: !prev[id] }))}
                                                        className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                                                    />
                                                    <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                                                        <span>{info.icon}</span>
                                                        <span>{info.label}</span>
                                                    </span>
                                                </div>
                                                <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full text-[9px] min-w-[18px] text-center font-bold">
                                                    {count}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        </div>
    );
};

export default Map;
