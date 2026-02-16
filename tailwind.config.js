/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                satoyama: {
                    forest: '#2D5A27', // Green-Gear Primary
                    soil: '#4A3728',   // Earthy Brown
                    leaf: '#879166',   // Muted Green
                    mist: '#F4F1E8',   // Background Cream
                    accent: '#D4A373', // Clay/Path color
                }
            }
        },
    },
    plugins: [],
}
