const submitButton = document.getElementById('submitButton');
const inputText = document.getElementById('inputText');
const resultJson = document.querySelector('#resultJson code');

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
            throw new Error(`Server error: ${response.statusText}`);
        }

        const data = await response.json();

        // Format the JSON with indentation for nice display
        resultJson.textContent = JSON.stringify(data, null, 2);

    } catch (error) {
        console.error("Error:", error);
        resultJson.textContent = `An error occurred: ${error.message}`;
    } finally {
        // Remove loading state
        submitButton.classList.remove('loading');
    }
});