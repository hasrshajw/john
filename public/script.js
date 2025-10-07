const submitButton = document.getElementById('submitButton');
const inputText = document.getElementById('inputText');
const resultJson = document.querySelector('#resultJson code'); // Targeting the <code> element inside <pre>

submitButton.addEventListener('click', async () => {
    const text = inputText.value.trim();
    if (!text) {
        alert("Please enter some text.");
        return;
    }

    // Add loading state to the button
    submitButton.classList.add('loading');
    resultJson.textContent = 'Processing...';

    try {
        // We call our serverless function using the path defined in netlify.toml
        const response = await fetch('/api/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text }),
        });

        if (!response.ok) {
            // If the server returns a 500, it sends back the error message text
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        // response.text() is safer here because we suspect the server might send text, not JSON, even on success
        const rawResponse = await response.text();
        
        // --- START OF CLEANING LOGIC ---
        let cleanJsonString = rawResponse.trim();
        
        // Check for and remove markdown formatting like ```json ... ``` or just ``` ... ```
        if (cleanJsonString.startsWith('```json') && cleanJsonString.endsWith('```')) {
            cleanJsonString = cleanJsonString.substring(7, cleanJsonString.length - 3).trim();
        } else if (cleanJsonString.startsWith('```') && cleanJsonString.endsWith('```')) {
            cleanJsonString = cleanJsonString.substring(3, cleanJsonString.length - 3).trim();
        }
        // --- END OF CLEANING LOGIC ---

        let data;
        try {
            // Try to parse the cleaned string as JSON
            data = JSON.parse(cleanJsonString);
        } catch (e) {
            // If parsing fails, it means the server returned a plain error string 
            // or non-JSON text even on success (status 200).
            throw new Error(`Response was not valid JSON: ${cleanJsonString.substring(0, 100)}...`);
        }

        // Format the JSON with indentation for nice display in the <code> block
        resultJson.textContent = JSON.stringify(data, null, 2);

    } catch (error) {
        console.error("Error:", error);
        // Display the error message in the code block for the user to see
        resultJson.textContent = `ERROR: ${error.message}`;
    } finally {
        // Remove loading state
        submitButton.classList.remove('loading');
    }
});
