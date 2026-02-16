import { useState, useEffect } from 'react';

interface BatteryManager extends EventTarget {
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
    onchargingchange: ((this: BatteryManager, ev: Event) => any) | null;
    onchargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
    ondischargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
    onlevelchange: ((this: BatteryManager, ev: Event) => any) | null;
}

// Extend Navigator interface to include getBattery
declare global {
    interface Navigator {
        getBattery?: () => Promise<BatteryManager>;
    }
}

export const useBatteryAwareness = () => {
    const [level, setLevel] = useState<number>(1); // 0.0 - 1.0
    const [charging, setCharging] = useState<boolean>(true);
    const [isSupported, setIsSupported] = useState<boolean>(false);

    useEffect(() => {
        if (!navigator.getBattery) {
            console.log('Battery Status API not supported');
            return;
        }

        let battery: BatteryManager;

        const handleBatteryChange = () => {
            setLevel(battery.level);
            setCharging(battery.charging);
        };

        navigator.getBattery().then((bat) => {
            battery = bat;
            setIsSupported(true);
            handleBatteryChange();

            bat.addEventListener('levelchange', handleBatteryChange);
            bat.addEventListener('chargingchange', handleBatteryChange);
        });

        return () => {
            if (battery) {
                battery.removeEventListener('levelchange', handleBatteryChange);
                battery.removeEventListener('chargingchange', handleBatteryChange);
            }
        };
    }, []);

    // Eco Mode Logic
    // Trigger if:
    // 1. Not charging AND Battery <= 20%
    const isEcoMode = isSupported && !charging && level <= 0.2;

    return {
        level,
        charging,
        isSupported,
        isEcoMode
    };
};
