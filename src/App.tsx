import { useState, useMemo, useEffect, useRef } from 'react'
import Map from './components/Map'
import NavigationBanner from './components/NavigationPopup' // Still using the same file but renamed component inside
import CourseInfoPanel from './components/CourseInfoPanel'
import { explorationRoutes } from './data/explorationRoutes'
import { useNavigation } from './hooks/useNavigation'

import WelcomeGuide from './components/WelcomeGuide'
import { getDistance } from './utils/distance'

type RouteType = 'sasayama-main' | string;

function App() {
    // Initialize from localStorage or default to 'none'
    const [activeRoute, setActiveRoute] = useState<RouteType>(() => {
        return localStorage.getItem('active_route') || 'none';
    });

    // Persist activeRoute changes
    useEffect(() => {
        localStorage.setItem('active_route', activeRoute);
    }, [activeRoute]);

    const [selectionTimestamp, setSelectionTimestamp] = useState<number>(0);

    // Debug: Trace route changes
    useEffect(() => {
        console.log('[App] Action Route Changed:', activeRoute);
    }, [activeRoute]);

    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);

    // Navigation State
    const [routeSteps, setRouteSteps] = useState<any[]>([]);

    // ... (rest of hooks)



    // Derived state for active route info
    // Derived state for active route info
    const selectedRoute = useMemo(() => explorationRoutes.find(r => r.id === activeRoute), [activeRoute]);

    const {
        currentStep,
        distanceToNext,
        currentSpeed,
        isNavigating,
        updateLocation,
        startNavigation,
        stopNavigation
    } = useNavigation(routeSteps);



    // Sorted Routes Logic
    const sortedRoutes = useMemo(() => {
        if (!userLocation) return explorationRoutes;

        return [...explorationRoutes].sort((a, b) => {
            // Helper to get distance (safely)
            const getDist = (r: typeof a) => {
                if (!r.startPoint) return Infinity;
                return getDistance(userLocation.lat, userLocation.lng, r.startPoint[1], r.startPoint[0]);
            };

            const distA = getDist(a);
            const distB = getDist(b);

            return distA - distB;
        });
    }, [userLocation]);

    // Format distance for display
    const formatDist = (meters: number) => {
        if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
        return `${Math.round(meters)}m`;
    };

    return (
        <div className="flex w-screen h-screen bg-satoyama-mist font-sans relative overflow-hidden">
            <style>
                {`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #879166; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #2D5A27; }
                
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                @keyframes slide-down {
                    0% { transform: translate(-50%, -100%); opacity: 0; }
                    100% { transform: translate(-50%, 0); opacity: 1; }
                }
                .animate-slide-down {
                    animation: slide-down 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards;
                }
                @keyframes pulse-slow {
                    0%, 100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
                    50% { transform: translate(-50%, 0) scale(1.05); opacity: 0.9; }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 3s ease-in-out infinite;
                }
                `}
            </style>

            {/* Mobile Menu Toggle Button */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="absolute top-4 left-4 z-[60] p-2 bg-satoyama-forest text-white rounded-md shadow-lg md:hidden border border-white/20"
                aria-label="Toggle Menu"
            >
                {isSidebarOpen ? '✕' : '☰'}
            </button>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="absolute inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Left Sidebar */}
            <aside className={`
                absolute md:relative z-50 h-full w-64 
                bg-satoyama-forest text-satoyama-mist flex-shrink-0 flex flex-col shadow-2xl 
                transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 border-b border-white/10 mt-12 md:mt-0 bg-[#2D5A27]">
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-white font-outfit">
                        Green-Gear
                    </h1>
                    <p className="text-sm text-white/90 mt-1 font-medium tracking-widest uppercase border-l-2 border-white pl-2 ml-1">
                        satoyama-ride
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4">
                    {/* Cycling Courses Section */}
                    <div className="mb-8">
                        <h2 className="text-xs uppercase tracking-widest text-satoyama-leaf font-bold mb-3 px-2 flex items-center gap-2">
                            <span className="text-lg">🚲</span> サイクリングコース {userLocation && <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full ml-auto shadow-sm">現在地から近い順</span>}
                        </h2>
                        <div className="space-y-3">
                            {sortedRoutes.filter(r => r.category === 'route').map((route, index) => {
                                const dist = userLocation ? getDistance(userLocation.lat, userLocation.lng, route.startPoint[1], route.startPoint[0]) : null;
                                const isClosest = userLocation && index === 0;
                                return (
                                    <div key={route.id} className={`relative rounded-lg transition-all duration-200 overflow-hidden border ${activeRoute === route.id ? 'bg-white border-satoyama-forest shadow-md' : 'hover:bg-satoyama-leaf/10 border-transparent'}`}>
                                        {isClosest && (
                                            <div className="absolute top-0 left-0 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-br-lg z-20 font-bold shadow-sm">
                                                一番近い
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between p-3">
                                            <button
                                                onClick={() => {
                                                    setActiveRoute(route.id);
                                                    setSelectionTimestamp(Date.now());
                                                    setIsSidebarOpen(false);
                                                }}
                                                className="flex-1 text-left flex flex-col gap-1 min-w-0" // min-w-0 for truncation logic if needed
                                            >
                                                <div className="flex items-start gap-2">
                                                    <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${activeRoute === route.id ? 'bg-satoyama-forest' : 'bg-satoyama-leaf'}`}></span>
                                                    <span className={`text-base font-bold leading-tight ${activeRoute === route.id ? 'text-satoyama-forest' : 'text-satoyama-mist'}`}>
                                                        {route.name}
                                                    </span>
                                                </div>
                                                {dist !== null && (
                                                    <div className="pl-5 text-xs text-gray-500 flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        現在地から {formatDist(dist)}
                                                    </div>
                                                )}
                                            </button>

                                            {/* Coexisting Navigation Button (Inline) */}
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${route.startPoint[1]},${route.startPoint[0]}&travelmode=bicycling`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`ml-2 flex flex-col items-center justify-center p-2 rounded-lg transition-colors border shadow-sm
                                                    ${activeRoute === route.id
                                                        ? 'bg-[#2D5A27] text-white border-[#1B3617] hover:bg-[#1B3617]'
                                                        : 'bg-white text-satoyama-forest border-gray-200 hover:bg-gray-50'}`}
                                                style={{ minWidth: '60px' }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <svg className="w-5 h-5 mb-0.5" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                                </svg>
                                                <span className="text-[9px] font-bold leading-none">NAVI</span>
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Area Guides Section */}
                    <div>
                        <h2 className="text-xs uppercase tracking-widest text-satoyama-leaf font-bold mb-3 px-2 flex items-center gap-2">
                            <span className="text-lg">🗺️</span> エリアガイド
                        </h2>
                        <div className="space-y-3">
                            {explorationRoutes.filter(r => r.category === 'area').map((route) => (
                                <button
                                    key={route.id}
                                    onClick={() => {
                                        setActiveRoute(route.id);
                                        setSelectionTimestamp(Date.now());
                                        setIsSidebarOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-4 rounded-lg transition-all duration-200 flex items-center gap-3 group min-h-[50px]
                                        ${activeRoute === route.id
                                            ? 'bg-white text-satoyama-forest shadow-md font-bold ring-1 ring-white'
                                            : 'hover:bg-satoyama-leaf/20 text-satoyama-mist'}`}
                                >
                                    <span className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${activeRoute === route.id ? 'bg-satoyama-forest' : 'bg-satoyama-leaf'}`}></span>
                                    <span className="text-base leading-tight">{route.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>



                <div className="p-4 border-t border-white/10 text-[10px] text-center text-satoyama-leaf opacity-60">
                    &copy; 2026 Green-Gear Project
                </div>
            </aside>

            {/* Main Map Area */}
            <main className="flex-grow relative h-full">
                {currentStep && (
                    <NavigationBanner
                        step={currentStep}
                        distance={distanceToNext}
                        speed={currentSpeed}
                    />
                )}

                {selectedRoute && (selectedRoute.category === 'route' || selectedRoute.category === 'area') && (
                    <CourseInfoPanel
                        route={selectedRoute}
                        isNavigating={isNavigating}
                        onStart={startNavigation}
                        onStop={stopNavigation}
                        className="absolute bottom-6 left-4 right-4 md:bottom-8 md:left-8 md:right-auto z-30"
                    />
                )}

                <Map
                    activeRoute={activeRoute}
                    isNavigating={isNavigating}

                    selectionTimestamp={selectionTimestamp}
                    speed={currentSpeed}
                    onUserLocationChange={(lat, lng) => {
                        setUserLocation({ lat, lng });
                        updateLocation(lat, lng);
                    }}
                    onStepsChange={(steps) => {
                        setRouteSteps(steps);
                        // Hacky way to get geometry: Map component should probably expose it better
                        // But for now, we rely on the fact that Map fetches it.
                        // Ideally we pass a callback for full route data.
                    }}
                    // Enhanced prop to capture geometry
                    onRouteLoaded={() => { }}
                    onProximityChange={() => { }}
                />

                {showWelcome && (
                    <WelcomeGuide
                        userLocation={userLocation}
                        routes={explorationRoutes}
                        onSelectRoute={(id) => {
                            setActiveRoute(id);
                            setSelectionTimestamp(Date.now());
                            setShowWelcome(false);
                        }}
                        onClose={() => setShowWelcome(false)}
                        onViewAllCourses={() => {
                            setShowWelcome(false);
                            setIsSidebarOpen(true);
                        }}
                    />
                )}
            </main>
        </div>
    )
}

export default App
