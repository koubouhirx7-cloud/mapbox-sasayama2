import React from 'react';
import { ExplorationRoute } from '../data/explorationRoutes';

type RouteType = 'recommended' | string;

interface RouteSelectorProps {
    activeRoute: RouteType;
    onRouteSelect: (routeId: RouteType) => void;
    sortedExplorationRoutes: (ExplorationRoute & { distance?: number })[];
}

const RouteSelector: React.FC<RouteSelectorProps> = ({ activeRoute, onRouteSelect, sortedExplorationRoutes }) => {
    return (
        <div className="flex bg-white/10 p-1 rounded-lg border border-white/20 gap-1 overflow-x-auto max-w-[70vw] no-scrollbar">
            <button
                onClick={() => onRouteSelect('recommended')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeRoute === 'recommended'
                    ? 'bg-satoyama-mist text-satoyama-forest shadow-sm'
                    : 'text-satoyama-mist hover:bg-white/10'
                    }`}
            >
                🚲 おすすめ
            </button>

            {sortedExplorationRoutes.map((route) => (
                <button
                    key={route.id}
                    onClick={() => onRouteSelect(route.id)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeRoute === route.id
                        ? 'bg-satoyama-mist text-satoyama-forest shadow-sm'
                        : 'text-satoyama-mist hover:bg-white/10'
                        }`}
                >
                    <span>🗺️ {route.name}</span>
                    {route.distance !== undefined && (
                        <span className="opacity-60 font-medium text-[9px]">
                            ({route.distance < 1000 ? `${Math.round(route.distance)}m` : `${(route.distance / 1000).toFixed(1)}km`})
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
};

export default RouteSelector;
