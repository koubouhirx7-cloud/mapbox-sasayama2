import React from 'react';
import { getStepIcon } from '../services/DirectionsService';

interface NavigationBannerProps {
    step: any;
    distance: number;
    speed?: number;
}

const NavigationBanner: React.FC<NavigationBannerProps> = ({ step, distance, speed }) => {
    if (!step) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-2xl animate-slide-down">
            <div className="bg-satoyama-forest shadow-2xl rounded-xl border-2 border-white/20 overflow-hidden flex text-white">
                {/* Icon Section */}
                <div className="w-24 bg-black/20 flex items-center justify-center border-r border-white/10">
                    <span className="text-6xl filter drop-shadow-md">
                        {getStepIcon(step.maneuver.type, step.maneuver.modifier)}
                    </span>
                </div>

                {/* Info Section */}
                <div className="flex-1 p-4 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold uppercase tracking-widest text-satoyama-leaf">
                            {`あと ${Math.round(distance)}m`}
                        </span>
                        {speed !== undefined && (
                            <span className="text-xs bg-black/30 px-2 py-0.5 rounded font-mono">
                                {Math.round(speed)} km/h
                            </span>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold leading-tight line-clamp-2">
                        {step.maneuver.instruction}
                    </h2>
                </div>

                {/* Distance Bar (Visual Progress) */}
                <div className="absolute bottom-0 left-0 h-1 bg-satoyama-accent transition-all duration-500 ease-linear"
                    style={{ width: `${Math.min(100, Math.max(0, (1 - distance / 200) * 100))}%` }}
                />
            </div>
        </div>
    );
};

export default NavigationBanner;
