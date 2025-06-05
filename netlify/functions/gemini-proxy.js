// netlify/functions/gemini-proxy.js

// Import necessary modules for Google Generative AI
// Make sure to install this package: npm install @google/generative-ai
const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require('@google/generative-ai');
// اگر در package.json شما axios تعریف شده است، می توانید آن را نیز import کنید.
// const axios = require('axios'); 


exports.handler = async function(event, context) {
    // Check if the request method is POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ error: 'Method Not Allowed. Only POST requests are accepted.' }),
        };
    }

    // Parse the request body
    const { prompt, imageBase64 } = JSON.parse(event.body);

    // Get your Gemini API key from Netlify Environment Variables
    // Make sure to set a variable named GEMINI_API_KEY in Netlify settings.
    // ** این خط را به درستی وارد کنید **
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) {
        console.error('API Key not found. Please set GEMINI_API_KEY in Netlify Environment Variables.');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: API Key is missing.' }),
        };
    }

    // Initialize the Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey); // استفاده از apiKey

    try {
        let model;
        let contents = [{ role: 'user', parts: [{ text: prompt }] }];

        if (imageBase64) {
            // Use gemini-pro-vision for image understanding
            model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
            contents[0].parts.push({
                inlineData: {
                    mimeType: 'image/png', // Or 'image/jpeg' depending on your image type
                    data: imageBase64,
                },
            });
        } else {
            // Use gemini-pro for text-only generation
            model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        }

        // Define safety settings to broaden the range of responses
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

        // Generate content using the chosen model
        const result = await model.generateContent({
            contents: contents,
            safetySettings: safetySettings, // Apply safety settings
        });

        // Extract the response text
        const responseText = result.response.text();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // This is important for CORS
            },
            body: JSON.stringify({ response: responseText }),
        };

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to get response from Gemini API.', details: error.message }),
        };
    }
};
