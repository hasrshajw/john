const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the Gemini AI model using the environment variable.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Using gemini-pro for compatibility.
const model = genAI.getGenerativeModel({ 
    model: "gemini-pro", 
    config: {
        projectId: "harsha-jw" // <-- MAKE SURE THIS IS YOUR ACTUAL PROJECT ID
    }
});

// Helper function to clean the text response
function cleanJsonString(text) {
    // 1. Remove markdown code block markers (```json ... ``` or ``` ... ```)
    let cleaned = text.replace(/```json\n([\s\S]*?)\n```/g, '$1');
    cleaned = cleaned.replace(/```\n([\s\S]*?)\n```/g, '$1');
    cleaned = cleaned.replace(/```([\s\S]*?)```/g, '$1'); // Catches other variations

    // 2. Trim any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // 3. Attempt to parse and stringify to ensure it's valid JSON structure
    try {
        const parsed = JSON.parse(cleaned);
        return JSON.stringify(parsed); // Return as a clean JSON string
    } catch (e) {
        // If parsing fails, return the cleaned text anyway, but it's a fallback.
        return cleaned;
    }
}

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { text } = JSON.parse(event.body);
        if (!text) {
            return { statusCode: 400, body: "Bad Request: No text provided." };
        }

        const prompt = `
          From the following text, extract these specific entities: name, age, the company they work for, and their location.

          Text: "${text}"

          Respond ONLY with a valid JSON object in the following format: {"name": "...", "age": "...", "job": "...", "location": "..."}.
          If any entity is not found, use an empty string "" as its value. Do not add any explanation or any other text outside of the JSON object.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const rawText = response.text();
        
        // Use the cleaning function on the raw output
        const finalJsonBody = cleanJsonString(rawText);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: finalJsonBody, // This should now be clean JSON!
        };
    } catch (error) {
        console.error("Error processing request:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to process your request." }),
        };
    }
};
