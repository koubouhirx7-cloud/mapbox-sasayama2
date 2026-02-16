import { useState, useCallback, useRef } from 'react';

interface PhotoEntry {
    id: string;
    lat: number;
    lng: number;
    timestamp: number;
    thumbnail: string; // base64 data URL (resized)
}

const PHOTOS_META_KEY = 'photo_markers';
const MAX_PHOTOS = 50;
const MAX_IMAGE_SIZE = 600; // px

const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width;
                let h = img.height;

                if (w > MAX_IMAGE_SIZE || h > MAX_IMAGE_SIZE) {
                    if (w > h) {
                        h = (h / w) * MAX_IMAGE_SIZE;
                        w = MAX_IMAGE_SIZE;
                    } else {
                        w = (w / h) * MAX_IMAGE_SIZE;
                        h = MAX_IMAGE_SIZE;
                    }
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const usePhotoMapping = () => {
    const [photos, setPhotos] = useState<PhotoEntry[]>(() => {
        try {
            const stored = localStorage.getItem(PHOTOS_META_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch { return []; }
    });

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const pendingLocationRef = useRef<{ lat: number; lng: number } | null>(null);

    const savePhotos = useCallback((updated: PhotoEntry[]) => {
        setPhotos(updated);
        try { localStorage.setItem(PHOTOS_META_KEY, JSON.stringify(updated)); } catch { /* full */ }
    }, []);

    const addPhoto = useCallback(async (file: File, lat: number, lng: number): Promise<PhotoEntry> => {
        const thumbnail = await resizeImage(file);

        const entry: PhotoEntry = {
            id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            lat,
            lng,
            timestamp: Date.now(),
            thumbnail,
        };

        const updated = [entry, ...photos].slice(0, MAX_PHOTOS);
        savePhotos(updated);

        return entry;
    }, [photos, savePhotos]);

    const deletePhoto = useCallback((id: string) => {
        const updated = photos.filter(p => p.id !== id);
        savePhotos(updated);
    }, [photos, savePhotos]);

    const triggerCapture = useCallback((lat: number, lng: number) => {
        pendingLocationRef.current = { lat, lng };

        if (!fileInputRef.current) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment';
            input.style.display = 'none';
            document.body.appendChild(input);
            fileInputRef.current = input;
        }

        fileInputRef.current.onchange = async (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file && pendingLocationRef.current) {
                await addPhoto(file, pendingLocationRef.current.lat, pendingLocationRef.current.lng);
            }
            target.value = ''; // reset for next use
        };

        fileInputRef.current.click();
    }, [addPhoto]);

    return {
        photos,
        addPhoto,
        deletePhoto,
        triggerCapture,
    };
};
