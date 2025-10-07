const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the Gemini AI model using the environment variable.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// FINAL MODEL CHOICE: Using "gemini-pro" for maximum compatibility with the current API setup.
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

exports.handler = async (event) => {
  // We only want to handle POST requests.
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Get the text from the request body sent by the frontend.
    const { text } = JSON.parse(event.body);
    if (!text) {
      return { statusCode: 400, body: "Bad Request: No text provided." };
    }

    // This is the prompt engineering. We give Gemini a very specific task.
    const prompt = `
      From the following text, extract these specific entities: name, age, the company they work for, and their location.

      Text: "${text}"

      Respond ONLY with a valid JSON object in the following format: {"name": "...", "age": "...", "job": "...", "location": "..."}.
      If any entity is not found, use an empty string "" as its value. Do not add any explanation or any other text outside of the JSON object.
    `;

    // Send the prompt to the Gemini model.
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonResponse = response.text();

    // Return the clean JSON response back to the frontend.
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: jsonResponse,
    };
  } catch (error) {
    // If anything goes wrong, log the error for debugging.
    console.error("Error with Gemini API:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to process your request." }),
    };
  }
};
