import React, { useEffect, useState } from 'react';
import { ExplorationRoute } from '../data/explorationRoutes';
import { getDistance } from '../utils/distance';

interface WelcomeGuideProps {
    userLocation: { lat: number, lng: number } | null;
    routes: ExplorationRoute[];
    onSelectRoute: (routeId: string) => void;
    onClose: () => void;
    onViewAllCourses?: () => void;
}

const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ userLocation, routes, onSelectRoute, onClose, onViewAllCourses }) => {
    const [recommendedRoutes, setRecommendedRoutes] = useState<ExplorationRoute[]>([]);
    const [distances, setDistances] = useState<{ [key: string]: number }>({});
    const [isLocating, setIsLocating] = useState(true);

    useEffect(() => {
        if (userLocation) {
            // Location found: Calculate distances
            const routeDistances: { route: ExplorationRoute, dist: number }[] = [];

            routes.forEach(route => {
                if (route.category !== 'route') return; // Only suggest real routes

                // Calculate distance using utility (no mapbox-gl required)
                // route.startPoint is [lng, lat], userLocation is {lat, lng}
                // getDistance(lat1, lng1, lat2, lng2)
                const dist = getDistance(
                    userLocation.lat,
                    userLocation.lng,
                    route.startPoint[1],
                    route.startPoint[0]
                ) / 1000; // Convert meters to km

                routeDistances.push({ route, dist });
            });

            routeDistances.sort((a, b) => a.dist - b.dist);
            setRecommendedRoutes(routeDistances.slice(0, 2).map(item => item.route));

            const distMap: { [key: string]: number } = {};
            routeDistances.forEach(item => {
                distMap[item.route.id] = parseFloat(item.dist.toFixed(1));
            });
            setDistances(distMap);
            setIsLocating(false);
        } else {
            // No location yet: Set timeout for fallback
            const timer = setTimeout(() => {
                setIsLocating(false);
                // Fallback to first 2 routes
                setRecommendedRoutes(routes.filter(r => r.category === 'route').slice(0, 2));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [userLocation, routes]);

    if (isLocating) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mb-4 md:mb-0 animate-slide-up text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-2"
                    >
                        ✕
                    </button>
                    <h2 className="text-2xl font-bold text-satoyama-forest mb-2 font-outfit">Green-Gearへようこそ</h2>
                    <p className="text-satoyama-soil animate-pulse mb-4">現在地を取得中...</p>
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-satoyama-forest"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mb-4 md:mb-0 animate-slide-up overflow-hidden">
                {/* Header */}
                <div className="bg-satoyama-forest p-6 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-xl font-bold z-20"
                    >
                        ✕
                    </button>
                    <h2 className="text-3xl font-bold font-outfit relative z-10">ようこそ、丹波篠山へ！</h2>
                    <p className="text-white/80 text-sm mt-1 relative z-10">
                        おすすめのコースをご案内いたします。
                    </p>
                </div>

                {/* Recommendations */}
                <div className="p-6 space-y-4">
                    {recommendedRoutes.map((route, index) => (
                        <div
                            key={route.id}
                            onClick={() => {
                                onSelectRoute(route.id);
                                onClose();
                            }}
                            className="group cursor-pointer border border-gray-100 rounded-xl p-4 hover:border-satoyama-forest/30 hover:shadow-md transition-all duration-200 bg-gray-50 hover:bg-white relative overflow-hidden"
                        >
                            {index === 0 && (
                                <div className="absolute top-0 right-0 bg-[#D4AF37] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg shadow-sm z-10">
                                    イチオシ
                                </div>
                            )}

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-satoyama-forest/10 flex items-center justify-center text-satoyama-forest font-bold text-xl shrink-0 group-hover:scale-110 transition-transform duration-300">
                                    {route.category === 'route' ? '🚲' : '🗺️'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 group-hover:text-satoyama-forest transition-colors">
                                        {route.name}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                        {distances[route.id] !== undefined ? (
                                            <span className="flex items-center gap-1">
                                                📍 現在地から <span className="font-bold text-satoyama-forest">{distances[route.id]} km</span>
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 italic">距離不明</span>
                                        )}
                                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                        <span>距離: {route.distance} km</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
                    <button
                        onClick={() => {
                            if (onViewAllCourses) {
                                onViewAllCourses();
                            } else {
                                onClose();
                            }
                        }}
                        className="text-satoyama-leaf text-sm font-bold hover:text-satoyama-forest transition-colors underline decoration-dotted underline-offset-4"
                    >
                        すべてのコースを地図で見る
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeGuide;
