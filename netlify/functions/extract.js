const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the Gemini AI model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// UPDATED THIS LINE with the correct model name
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

exports.handler = async (event) => {
  // We only accept POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Get the text from the request body
    const { text } = JSON.parse(event.body);
    if (!text) {
      return { statusCode: 400, body: "Bad Request: No text provided." };
    }

    // This is the core of the logic. We create a highly specific prompt.
    const prompt = `
      From the following text, extract these specific entities: name, age, the company they work for, and their location.

      Text: "${text}"

      Respond ONLY with a valid JSON object in the following format: {"name": "...", "age": "...", "job": "...", "location": "..."}.
      If any entity is not found, use an empty string "" as its value. Do not add any explanation or any other text outside of the JSON object.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonResponse = response.text();

    // Return the clean JSON response from Gemini
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: jsonResponse,
    };
  } catch (error) {
    console.error("Error with Gemini API:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to process your request." }),
    };
  }
};
