import React, { useState } from 'react';
import { ExplorationRoute } from '../data/explorationRoutes';

interface CourseInfoPanelProps {
    route: ExplorationRoute;
    isNavigating?: boolean;
    onStart?: () => void;
    onStop?: () => void;
    className?: string;
}

const CourseInfoPanel: React.FC<CourseInfoPanelProps> = ({ route, isNavigating = false, onStart, onStop, className = '' }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className={`bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-satoyama-forest/10 max-w-sm md:max-w-md transition-all duration-300 ${className}`}>
            <div className="text-[10px] text-red-500 opacity-50 absolute -top-4 left-0">DEBUG_ANTIGRAVITY</div>
            <div className="flex items-start justify-between gap-3 mb-1">
                <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <h2 className="text-lg font-bold text-satoyama-forest leading-tight font-outfit pr-2">
                        {route.name}
                    </h2>
                    {route.category === 'route' && (
                        <div className="flex items-center gap-2 mt-1 text-satoyama-leaf font-bold tracking-wide text-xs">
                            <span className="bg-satoyama-forest/10 px-2 py-0.5 rounded text-satoyama-forest">
                                {route.distance || '0'} km
                            </span>
                            <span>cycling course</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                        {/* Navigate to Start Button */}
                        {route.startPoint && (
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${route.startPoint[1]},${route.startPoint[0]}&travelmode=bicycling`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded-full text-[10px] font-bold shadow-sm transition-colors"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                </svg>
                                <span>NAVI</span>
                            </a>
                        )}

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full text-gray-500 transition-colors"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                            {isExpanded ? (
                                // Chevron Down
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            ) : (
                                // Chevron Up
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-2 animate-fadeIn">
                    <p className="text-sm text-satoyama-soil leading-relaxed mb-4 border-t border-dashed border-satoyama-leaf/30 pt-3">
                        {route.description || 'No description available.'}
                    </p>

                    {route.category !== 'none' && (
                        <div className="space-y-3">

                            <button
                                onClick={() => {
                                    if (isNavigating) {
                                        if (onStop) onStop();
                                    } else {
                                        if (onStart) onStart();
                                        setIsExpanded(false);
                                    }
                                }}
                                className={`w-full py-3 rounded-lg font-bold text-xl shadow-md transition-colors flex items-center justify-center gap-2 border-t border-white/10 ${isNavigating
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-satoyama-forest hover:bg-[#1a3815] text-white'
                                    }`}
                            >
                                {isNavigating ? (
                                    <>
                                        <span className="text-xs">■</span> STOP
                                    </>
                                ) : (
                                    <>
                                        <span className="text-xs">▶</span> START
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CourseInfoPanel;
