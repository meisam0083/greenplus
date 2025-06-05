// netlify/functions/gemini-proxy.js
// این فایل باید در پوشه netlify/functions قرار گیرد

// پکیج‌های لازم برای Google Generative AI را وارد کنید
// مطمئن شوید که این پکیج نصب شده است: npm install @google/generative-ai
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
    // حتماً متغیری به نام GEMINI_API_KEY را در تنظیمات Netlify خود تنظیم کنید.
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
            // برای درک تصویر از gemini-1.0-pro-vision استفاده می‌کنیم (تغییر یافته از gemini-pro-vision)
            model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro-vision' });
            contents[0].parts.push({
                inlineData: {
                    mimeType: 'image/png', // یا 'image/jpeg' بسته به نوع تصویر شما
                    data: imageBase64,
                },
            });
        } else {
            // برای تولید فقط متن از gemini-1.0-pro استفاده می‌کنیم (تغییر یافته از gemini-pro)
            model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
        }

        // تنظیمات ایمنی را برای گسترده‌تر کردن محدوده پاسخ‌ها تعریف کنید
        const safetySettings = [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
        ];

        // محتوا را با استفاده از مدل انتخاب شده تولید کنید
        const result = await model.generateContent({
            contents: contents,
            safetySettings: safetySettings, // اعمال تنظیمات ایمنی
        });

        // متن پاسخ را استخراج کنید
        const responseText = result.response.text();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // این برای CORS مهم است
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
