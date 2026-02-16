/**
 * Web Audio API based sound generator for navigation SE
 */

let audioCtx: AudioContext | null = null;

const getAudioCtx = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
};

const playBeep = (freq: number, duration: number, volume: number = 0.5, delay: number = 0) => {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
};

// 50m Warning: Single high beep
export const playWarningChime = () => {
    playBeep(880, 0.15); // A5 note
};

// 10m Turn: Double high beep ("Pohn, Pohn")
export const playTurnChime = () => {
    playBeep(880, 0.1, 0.5, 0);
    playBeep(880, 0.1, 0.5, 0.2);
};

// Off-Route: Low buzzer/alert
export const playOffRouteAlert = () => {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
};
