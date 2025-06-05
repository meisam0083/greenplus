// functions/gemini-proxy.js
const axios = require('axios');

// کلید API Gemini خود را اینجا قرار دهید
const GEMINI_API_KEY = "process.env.GEMINI_API_KEY;"
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
const GEMINI_VISION_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent";

exports.handler = async function(event, context) {
  // فقط درخواست‌های POST را پذیرش می‌کنیم
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const requestBody = JSON.parse(event.body);
    const { prompt, imageBase64 } = requestBody;
    
    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Prompt is required" })
      };
    }

    let apiUrl = GEMINI_API_URL;
    let requestData = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    };

    // اگر تصویر ارسال شده باشد، از API Vision استفاده می‌کنیم
    if (imageBase64) {
      apiUrl = GEMINI_VISION_API_URL;
      requestData = {
        contents: [
          {
            parts: [
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: imageBase64
                }
              }
            ]
          }
        ]
      };
    }

    // ارسال درخواست به API Gemini
    const response = await axios.post(`<span class="math-inline">\{apiUrl\}?key\=</span>{apiKey}`, requestData);
    
    // استخراج پاسخ متنی
    const textResponse = response.data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ response: textResponse })
    };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Error processing request",
        details: error.message
      })
    };
  }
};

