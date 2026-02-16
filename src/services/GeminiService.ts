const API_KEY = import.meta.env.VITE_GOOGLE_GENAI_API_KEY;

// Model fallback chain: try each model in order until one works
const MODEL_CANDIDATES = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
];

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const SYSTEM_PROMPT = `あなたは丹波篠山で30年間観光ガイドを務める大ベテラン「サトヤマAI」です。
丹波篠山の歴史、地理、自然環境、名所、そして地元の人しか知らない絶景ポイントまで、あらゆることを知り尽くしたスペシャリストとして振る舞ってください。

利用者は【兵庫県丹波篠山市】を自転車で旅しています。
あなたの豊富な知識と経験を活かし、土地への深い愛情と共に案内してください。

【最重要ルール】
1. 丹波篠山市（および隣接する丹波市・三田市の一部）以外の場所は、絶対に案内しないでください。
2. 提案するスポットは、提供された周辺スポットリスト（名称、種別）を最優先し、【実在する店舗名・施設名】を正確に答えてください。
3. 特に、丹波篠山独自の「歴史的な街並み（城下町、宿場町）」、「古民家カフェ」、「寺社仏閣」、「季節の絶景」の情報を重視して案内してください。
4. 具体的におすすめスポットを【必ず3つ】案内してください。
5. 各スポットには必ず【Googleマップ検索リンク】を付けてください。
   形式: [スポット名](https://www.google.com/maps/search/?api=1&query=地点名+丹波篠山)
6. 口調は、丁寧ながらも自信に満ちた、頼りがいのあるベテランガイドらしく話してください。（例：「〜ですな」「〜がおすすめですよ」「ここは見逃せません」など）
7. 架空の場所や、遠く離れた場所を教えることは厳禁です。`;

/**
 * Try a single model and return the response text or throw on failure.
 */
async function tryModel(model: string, prompt: string): Promise<string> {
    const url = `${BASE_URL}/${model}:generateContent`;
    console.log(`Gemini: trying model "${model}"...`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': API_KEY,
        },
        body: JSON.stringify({
            system_instruction: {
                parts: [{ text: SYSTEM_PROMPT }],
            },
            contents: [{ parts: [{ text: prompt }] }],
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.warn(`Gemini: model "${model}" failed (${response.status}):`, errorData.error?.message);

        // Rate limit – don't try other models, just report the wait time
        if (response.status === 429) {
            const waitMatch = errorData.error?.message?.match(/retry in ([\d.]+)s/);
            const seconds = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) : '60';
            throw new Error(`RATE_LIMIT:${seconds}`);
        }

        // Auth error – key itself is bad, no point trying other models
        if (response.status === 403) {
            throw new Error('AUTH_ERROR');
        }

        // 404 or other – throw generic so we can try next model
        throw new Error(`${response.status}: ${errorData.error?.message || 'Unknown'}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error('Empty response from model');
    }

    console.log(`Gemini: success with model "${model}"`);
    return text;
}

/**
 * Main entry point – tries each model in the fallback chain.
 */
export const fetchGeminiResponse = async (prompt: string): Promise<string> => {
    if (!API_KEY) {
        console.error('Gemini API Error: VITE_GOOGLE_GENAI_API_KEY is missing.');
        return 'エラー：AIのAPIキーが見つかりません。Vercel設定を確認し再デプロイしてください。';
    }

    const errors: string[] = [];

    for (const model of MODEL_CANDIDATES) {
        try {
            return await tryModel(model, prompt);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);

            // Rate limit – stop immediately, don't try other models
            if (message.startsWith('RATE_LIMIT:')) {
                const seconds = message.split(':')[1];
                return `【AI混雑中】一度に送れる回数制限に達しました。あと ${seconds} 秒ほど待ってから、もう一度「送信」してください。`;
            }

            // Auth error – stop immediately
            if (message === 'AUTH_ERROR') {
                return '【認証エラー】APIキーが無効です。AI Studioで新しいキーを作成し、Vercelの環境変数を更新して再デプロイしてください。';
            }

            // Otherwise, record the error and try the next model
            errors.push(`${model}: ${message}`);
            console.log(`Gemini: "${model}" unavailable, trying next...`);
        }
    }

    // All models failed
    console.error('Gemini: all models failed:', errors);
    return `エラー：すべてのAIモデルが利用不可でした。しばらく待ってから再度お試しください。\n(詳細: ${errors.join(' / ')})`;
};
