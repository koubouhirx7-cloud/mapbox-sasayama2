import courseSasayama from './course_sasayama.json';
import courseTamba from './course_tamba.json';
import courseFukusumi from './course_fukusumi.json';
import courseTannan from './course_tannan.json';
import courseJoto from './course_joto.json';
import courseNishiki from './course_nishiki.json';
import courseLoop from './course_loop.json';
import courseTachikui from './course_tachikui.json';

export interface ExplorationRoute {
    id: string;
    name: string;
    startPoint: [number, number]; // [lng, lat]
    color: string;
    category: 'route' | 'area' | 'none';
    data?: any;
    distance?: number; // km
    description?: string;
}

export const explorationRoutes: ExplorationRoute[] = [
    {
        id: 'none',
        name: '--- コースを選択してください ---',
        startPoint: [135.2166, 35.0755],
        color: '#ffffff00',
        category: 'none',
        description: '左側のメニューまたはエリアガイドから、探索したいコースを選択してください。'
    },
    {
        id: 'sasayama-main',
        name: '味間ルート (丹波篠山茶の里)',
        startPoint: [135.16195, 35.0747],
        color: '#2D5A27',
        category: 'route',
        data: courseSasayama,
        distance: 13.9,
        description: '1200年前から続く隠れた茶畑の里、味間（あじま）エリアを巡るサイクリングコース。静かな里山の風景を楽しめます。'
    },
    {
        id: 'tamba-ride',
        name: '妻入り造り・城下町コース (丹波篠山 西部)',
        startPoint: [135.215286, 35.075110],
        color: '#2D5A27',
        category: 'route',
        data: courseTamba,
        distance: 12.6,
        description: '河原町妻入商家群など、城下町の歴史的な町並みを巡るコース。古民家カフェや雑貨店巡りにも最適です。'
    },
    {
        id: 'fukusumi-ride',
        name: '宿場町 福住コース (丹波篠山 東部)',
        startPoint: [135.343914, 35.071843],
        color: '#5D4037',
        category: 'route',
        data: courseFukusumi,
        distance: 7.4,
        description: '重要伝統的建造物群保存地区である福住の宿場町を巡るコース。往時の面影を残す静かな町並みを楽しめます。'
    },
    {
        id: 'sasayama-loop',
        name: '篠山口駅・城下町 1周コース',
        startPoint: [135.1782, 35.0567],
        color: '#1E88E5',
        category: 'route',
        data: courseLoop,
        distance: 15.0,
        description: '篠山口駅を起点に、城下町エリアをぐるっと一周する周遊コース。アクセス良好で、観光のメインルートとしておすすめです。'
    },
    {
        id: 'tannan-ride',
        name: '丹南エリア 渓谷コース',
        startPoint: [135.15413, 35.07742],
        color: '#43A047',
        category: 'route',
        data: courseTannan,
        distance: 17.5,
        description: '篠山川の渓谷美や、丹波竜化石発見地周辺を走る自然豊かなコース。ダイナミックな景観が魅力です。'
    },
    {
        id: 'joto-ride',
        name: '城東エリア 歴史街道コース',
        startPoint: [135.278385, 35.070087],
        color: '#D84315',
        category: 'route',
        data: courseJoto,
        distance: 16.7,
        description: 'かつての街道沿いの歴史を感じながら、広大な田園風景の中を走るコース。日置地区などの史跡も点在しています。'
    },
    {
        id: 'nishiki-ride',
        name: '西紀エリア 四季コース',
        startPoint: [135.1616, 35.07501],
        color: '#8E24AA',
        category: 'route',
        data: courseNishiki,
        distance: 22.6,
        description: '四季折々の自然と、修験道の歴史が残る山里を巡るコース。距離があり、走りごたえのあるルートです。'
    },
    {
        id: 'tachikui-ride',
        name: '立杭エリア (今田町) 陶芸コース',
        startPoint: [135.13075, 34.98046],
        color: '#795548',
        category: 'route',
        data: courseTachikui,
        distance: 13.2,
        description: '日本六古窯の一つ、丹波焼の里・立杭（たちくい）の窯元路地を散策。陶芸体験やギャラリー巡りが楽しめます。'
    },
    {
        id: 'station-area',
        name: '篠山口駅エリア',
        startPoint: [135.1740, 35.0610],
        color: '#FF8C00',
        category: 'area',
        description: '篠山口駅周辺のレンタサイクル拠点や、出発前の立ち寄りスポット。'
    },
    {
        id: 'jokamachi-area',
        name: '城下町エリア',
        startPoint: [135.215286, 35.075110],
        color: '#800000',
        category: 'area',
        description: '篠山城跡を中心とした城下町エリア。歴史散策や食べ歩きにおすすめのスポットが集中しています。'
    },
    {
        id: 'imada-area',
        name: '立杭・今田エリア',
        startPoint: [135.130, 34.980],
        color: '#1E88E5',
        category: 'area',
        description: '立杭焼の里として知られる今田町。歴史ある窯元や陶芸体験が楽しめるエリアです。'
    },
    {
        id: 'fukusumi-area',
        name: '福住エリア',
        startPoint: [135.343914, 35.071843],
        color: '#43A047',
        category: 'area',
        description: '重要伝統的建造物群保存地区に指定されている宿場町。静かな歴史の町並みを探索できます。'
    },
    {
        id: 'nishiki-area',
        name: '西紀エリア',
        startPoint: [135.1796, 35.0940],
        color: '#8E24AA',
        category: 'area',
        description: '美しい自然と山里の風景が広がる西紀エリア。サイクリングや自然散策に最適です。'
    }
];
