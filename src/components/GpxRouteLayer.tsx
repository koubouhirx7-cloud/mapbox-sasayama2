import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface GpxRouteLayerProps {
    map: mapboxgl.Map;
    isVisible: boolean;
    onRouteLoaded?: (route: any) => void;
    routeData: any;
}

const GpxRouteLayer: React.FC<GpxRouteLayerProps> = ({ map, isVisible, onRouteLoaded, routeData }) => {
    const animationRef = useRef<number>();

    useEffect(() => {
        if (!map || !routeData) return;

        // Pass route data up
        // We prioritize the LineString (Route) for elevation profile logic upstream, if any specific logic needs it.
        // Or we pass the whole collection? The upstream likely expects a Feature.
        if (onRouteLoaded && routeData.features) {
            const routeFeature = routeData.features.find((f: any) => f.geometry.type === 'LineString');
            if (routeFeature) {
                onRouteLoaded(routeFeature);
            }
        }

        // Toggle visibility immediately if layers exist
        const layers = ['gpx-route-line', 'gpx-route-arrows', 'gpx-spots-circle', 'gpx-spots-label'];
        layers.forEach(id => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', isVisible ? 'visible' : 'none');
            }
        });

        const addLayers = () => {
            // Handle Route Line
            if (!map.getSource('gpx-route')) {
                const routeFeature = routeData.features && routeData.features.find((f: any) => f.geometry.type === 'LineString');

                if (routeFeature) {
                    const coords = routeFeature.geometry.coordinates;
                    const features: any[] = [];

                    for (let i = 0; i < coords.length - 1; i++) {
                        const p1 = coords[i];
                        const p2 = coords[i + 1];
                        const dEle = (p2[2] || 0) - (p1[2] || 0);
                        const dist = Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2)) * 111000;
                        const slope = dist > 5 ? dEle / dist : 0;

                        let category = 'flat';
                        if (slope > 0.05) category = 'steep';
                        else if (slope > 0.02) category = 'moderate';
                        else if (slope < -0.05) category = 'downhill';

                        features.push({
                            type: 'Feature',
                            properties: { category, slope },
                            geometry: {
                                type: 'LineString',
                                coordinates: [p1, p2]
                            }
                        });
                    }

                    map.addSource('gpx-route', {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: features
                        }
                    });

                    map.addLayer({
                        id: 'gpx-route-line',
                        type: 'line',
                        source: 'gpx-route',
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: {
                            'line-width': 8,
                            'line-color': [
                                'match', ['get', 'category'],
                                'steep', '#D32F2F',    // Red
                                'moderate', '#F57C00', // Orange
                                'downhill', '#1E88E5', // Blue
                                '#2D5A27'            // Green
                            ],
                            'line-opacity': 0.9
                        }
                    });

                    map.addLayer({
                        id: 'gpx-route-arrows',
                        type: 'symbol',
                        source: 'gpx-route',
                        layout: {
                            'symbol-placement': 'line',
                            'symbol-spacing': 50,
                            'text-field': '▶',
                            'text-size': 14,
                            'text-keep-upright': false,
                            'text-rotation-alignment': 'map',
                            'text-allow-overlap': true,
                            'text-ignore-placement': true
                        },
                        paint: {
                            'text-color': '#FFFFFF',
                            'text-opacity': 0.9
                        }
                    });
                }
            } else {
                // If source exists, we should update it if the route changed.
                // However, the upstream logic might trigger a full remount of this component if `key` changes or if we unmount it.
                // In `Map.tsx`, we render `<GpxRouteLayer key={activeRoute} ... />`? No, without key.
                // So we must handle updates.
                // Re-calculating features is needed.
                // For now, let's assume the cleanup removes it, so we start fresh.
                // But wait, the `useEffect` cleanup removes these. So `addLayers` is called on a fresh state.
            }

            // Handle Spots (Points)
            if (!map.getSource('gpx-spots')) {
                const pointFeatures = routeData.features ? routeData.features.filter((f: any) => f.geometry.type === 'Point') : [];

                if (pointFeatures.length > 0) {
                    map.addSource('gpx-spots', {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: pointFeatures
                        }
                    });

                    // Circle Marker
                    map.addLayer({
                        id: 'gpx-spots-circle',
                        type: 'circle',
                        source: 'gpx-spots',
                        paint: {
                            'circle-radius': 8,
                            'circle-color': '#FF8C00', // Dark Orange
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#FFFFFF',
                            'circle-opacity': 1
                        }
                    });

                    // Label (Name)
                    map.addLayer({
                        id: 'gpx-spots-label',
                        type: 'symbol',
                        source: 'gpx-spots',
                        layout: {
                            'text-field': ['get', 'name'],
                            'text-font': ['Noto Sans CJK JP Bold', 'Open Sans Bold'], // Use standard fonts
                            'text-size': 12,
                            'text-offset': [0, 1.5],
                            'text-anchor': 'top',
                            'text-max-width': 20
                        },
                        paint: {
                            'text-color': '#2d5a27',
                            'text-halo-color': '#ffffff',
                            'text-halo-width': 2
                        }
                    });
                }
            }

            // Animation
            if (!animationRef.current) {
                let opacity = 0.5;
                let increment = 0.01;
                const animate = () => {
                    opacity += increment;
                    if (opacity > 0.9 || opacity < 0.4) increment *= -1;

                    if (map.getLayer('gpx-route-arrows')) {
                        map.setPaintProperty('gpx-route-arrows', 'text-opacity', opacity);
                    }
                    animationRef.current = requestAnimationFrame(animate);
                };
                animate();
            }
        };

        if (map.isStyleLoaded()) {
            addLayers();
        } else {
            map.on('load', addLayers);
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = undefined;
            }
            ['gpx-route-arrows', 'gpx-route-line', 'gpx-spots-circle', 'gpx-spots-label'].forEach(id => {
                if (map.getLayer(id)) map.removeLayer(id);
            });
            ['gpx-route', 'gpx-spots'].forEach(id => {
                if (map.getSource(id)) map.removeSource(id);
            });
        };
    }, [map, isVisible, routeData]);

    return null;
};

export default GpxRouteLayer;
