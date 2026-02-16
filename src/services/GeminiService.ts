const API_KEY = import.meta.env.VITE_GOOGLE_GENAI_API_KEY;
// Using v1beta endpoint to support system_instruction
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export const fetchGeminiResponse = async (prompt: string): Promise<string> => {
    if (!API_KEY) {
        console.error('Gemini API Error: VITE_GOOGLE_GENAI_API_KEY is missing.');
        return 'エラー：AIのAPIキーが見つかりません。Vercel設定を確認し再デプロイしてください。';
    }

    console.log('Gemini Request: sending to gemini-1.5-flash (v1)...');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY // Use header for security/stability
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{
                        text: `あなたは丹波篠山で30年間観光ガイドを務める大ベテラン「サトヤマAI」です。
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
7. 架空の場所や、遠く離れた場所を教えることは厳禁です。`
                    }]
                },
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API Details:', JSON.stringify(errorData, null, 2));

            if (response.status === 429) {
                // 待機時間を抽出（例: retry in 37s）
                const waitMatch = errorData.error?.message?.match(/retry in ([\d.]+)s/);
                const seconds = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) : '60';
                return `【AI混雑中】一度に送れる回数制限に達しました。あと ${seconds} 秒ほど待ってから、もう一度「送信」してください。`;
            }

            if (response.status === 403) {
                return '【認証エラー】APIキーが無効です。AI Studioで新しいキーを作成し、Vercelの環境変数を更新して再デプロイしてください。';
            }

            return `エラーが発生しました (${response.status}: ${errorData.error?.message || 'Unknown'})`;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return text || '回答を生成できませんでした。';
    } catch (error) {
        console.error('Gemini Network Error:', error);
        return 'エラー：AIサービスに接続できませんでした。';
    }
};
