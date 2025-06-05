// netlify/functions/gemini-proxy.js
// این فایل باید در پوشه netlify/functions قرار گیرد

// پکیج‌های لازم برای Google Generative AI را وارد کنید
const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require('@google/generative-ai');

exports.handler = async function(event, context) {
    // فقط درخواست‌های POST را می‌پذیریم
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ error: 'Method Not Allowed. Only POST requests are accepted.' }),
        };
    }

    // بدنه درخواست را تجزیه کنید
    const { prompt, imageBase64 } = JSON.parse(event.body);

    // کلید API جمینی خود را از متغیرهای محیطی Netlify دریافت کنید
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) {
        console.error('API Key not found. Please set GEMINI_API_KEY in Netlify Environment Variables.');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: API Key is missing.' }),
        };
    }

    // کلاینت Generative AI را با کلید API از متغیرهای محیطی مقداردهی اولیه کنید
    const genAI = new GoogleGenerativeAI(apiKey); 

    try {
        let model;
        let contents = [{ role: 'user', parts: [{ text: prompt }] }];

        if (imageBase64) {
            // تغییر مدل به gemini-2.5-flash برای درک تصویر
            model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            contents[0].parts.push({
                inlineData: {
                    mimeType: 'image/png', // یا 'image/jpeg'
                    data: imageBase64,
                },
            });
        } else {
            // تغییر مدل به gemini-2.5-flash برای تولید متن
            model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        }

        // تنظیمات ایمنی
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        // تولید محتوا
        const result = await model.generateContent({
            contents: contents,
            safetySettings: safetySettings,
        });

        const responseText = result.response.text();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ response: responseText }),
        };

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Failed to get response from Gemini API.',
                details: error.message
            }),
        };
    }
};
