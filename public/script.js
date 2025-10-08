const submitButton = document.getElementById('submitButton');
const editButton = document.getElementById('editButton');
const saveButton = document.getElementById('saveButton');
const retryButton = document.getElementById('retryButton');
const imageUpload = document.getElementById('imageUpload');
const inputText = document.getElementById('inputText');
const resultJsonCode = document.querySelector('#resultJson code');
const profileDisplay = document.getElementById('profileDisplay');
const detailDisplay = document.getElementById('detailDisplay');
const profileImage = document.getElementById('profileImage');
const actionButtonsDiv = document.getElementById('actionButtons');

firebase.initializeApp({
  apiKey: "AIzaSyAuxA-e71uX_uLDe6oyFU69q-eLfgUzbXA",
  authDomain: "harsha-jw.firebaseapp.com",
  projectId: "harsha-jw",
  storageBucket: "harsha-jw.firebasestorage.app",
  messagingSenderId: "471408120499",
  appId: "1:471408120499:web:91e61514ad3703ce3b16c6",
  measurementId: "G-NBC16X4R1T"
});
const db = firebase.firestore();
const storage = firebase.storage();

let uploadedFile = null;
let currentExtractedData = null;
let currentFirebaseDocId = null;

imageUpload.addEventListener('change', handleImageUpload);
submitButton.addEventListener('click', submitData);
editButton.addEventListener('click', handleEdit);
saveButton.addEventListener('click', handleSave);
retryButton.addEventListener('click', handleRetry);

function handleImageUpload(event) {
    if (event.target.files.length > 0) {
        uploadedFile = event.target.files[0];
        const imageUrl = URL.createObjectURL(uploadedFile);
        profileImage.src = imageUrl;
        profileImage.style.display = 'block';
        profileDisplay.style.display = 'block';
    }
}

async function submitData() {
    submitButton.classList.add('loading');
    resultJsonCode.textContent = 'Processing...';
    profileDisplay.style.display = 'none';
    actionButtonsDiv.style.display = 'none';
    
    let textToSummarize = inputText.value.trim();
    let imageUrl = null;

    try {
        if (uploadedFile) {
            const storageRef = storage.ref(`images/${Date.now()}-${uploadedFile.name}`);
            const snapshot = await storageRef.put(uploadedFile);
            imageUrl = await snapshot.ref.getDownloadURL();
            
            if (!textToSummarize) {
                 textToSummarize = "Placeholder text extracted from image. Please paste text or use a real OCR service.";
                 inputText.value = textToSummarize;
            }
        }

        const response = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToSummarize }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const rawResponse = await response.text();
        
        let cleanJsonString = rawResponse.trim();
        if (cleanJsonString.startsWith('```json') && cleanJsonString.endsWith('```')) {
            cleanJsonString = cleanJsonString.substring(7, cleanJsonString.length - 3).trim();
        } else if (cleanJsonString.startsWith('```') && cleanJsonString.endsWith('```')) {
            cleanJsonString = cleanJsonString.substring(3, cleanJsonString.length - 3).trim();
        }

        const data = JSON.parse(cleanJsonString);
        currentExtractedData = data;
        
        displayResults(data, imageUrl);

    } catch (error) {
        console.error("Error:", error);
        resultJsonCode.textContent = `ERROR: ${error.message}`;
    } finally {
        submitButton.classList.remove('loading');
    }
}

function displayResults(data, imageUrl) {
    resultJsonCode.textContent = JSON.stringify(data, null, 2);
    profileDisplay.style.display = 'block';
    actionButtonsDiv.style.display = 'flex';
    
    let detailHtml = '<h3>Extracted Details:</h3><ul>';
    for (const key in data) {
        detailHtml += `<li><strong>${key}:</strong> ${data[key]}</li>`;
    }
    detailHtml += '</ul>';
    detailDisplay.innerHTML = detailHtml;
    
    if (imageUrl) {
        profileImage.src = imageUrl;
        profileImage.style.display = 'block';
    } else {
        profileImage.style.display = 'none';
    }
}

function handleEdit() {
    detailDisplay.innerHTML = `
        <h4>Edit Extracted Data:</h4>
        <form id="editForm" style="display: flex; flex-direction: column;">
            ${Object.keys(currentExtractedData).map(key => `
                <p style="margin: 5px 0;">
                    <label style="display: inline-block; width: 80px;">${key}:</label>
                    <input type="text" name="${key}" value="${currentExtractedData[key] || ''}" style="width: calc(100% - 90px); padding: 5px; border-radius: 3px; color: #000;">
                </p>
            `).join('')}
            <p style="margin-top: 15px;"><button type="submit" style="background-color: #28a745; color: white; padding: 8px; border: none; border-radius: 4px; cursor: pointer;">Apply Changes</button></p>
        </form>
    `;

    document.getElementById('editForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const newFormData = {};
        newFormData.name = this.name.value;
        newFormData.age = this.age.value;
        newFormData.job = this.job.value;
        newFormData.location = this.location.value;
        
        currentExtractedData = newFormData;
        displayResults(currentExtractedData, profileImage.src.includes('blob:') ? profileImage.src : null);
        submitButton.disabled = false; 
    });
}

async function handleSave() {
    if (!currentExtractedData) return;

    submitButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    try {
        const docRef = await db.collection("extracted_data").add({
            jsonData: currentExtractedData,
            imageUrl: profileImage.src.includes('blob:') ? 'PENDING_UPLOAD' : profileImage.src,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        currentFirebaseDocId = docRef.id;
        
        if (profileImage.src.includes('blob:')) {
             const storageRef = storage.ref(`images/${currentFirebaseDocId}-${Date.now()}-${uploadedFile.name}`);
             await storageRef.put(uploadedFile);
             const finalUrl = await storageRef.getDownloadURL();
             await db.collection("extracted_data").doc(currentFirebaseDocId).update({
                 imageUrl: finalUrl
             });
        }

        alert(`Data Saved Successfully! Document ID: ${docRef.id}`);
    } catch (e) {
        console.error("Error saving document: ", e);
        alert("Error saving to database: " + e.message);
    } finally {
        saveButton.textContent = 'Delete';
        submitButton.disabled = false;
    }
}

function handleRetry() {
    if (!inputText.value.trim()) {
        alert("Please provide text in the input area to retry extraction.");
        return;
    }
    currentExtractedData = null;
    currentFirebaseDocId = null;
    resultJsonCode.textContent = '{}';
    submitData(); 
}

async function handleDelete() {
    if (!currentFirebaseDocId) {
        alert("No data saved to this session to delete.");
        return;
    }
    
    submitButton.disabled = true;
    saveButton.textContent = 'Deleting...';
    
    try {
        await db.collection("extracted_data").doc(currentFirebaseDocId).delete();
        
        if (profileImage.src.includes('firebasestorage.googleapis.com')) {
             await storage.refFromURL(profileImage.src).delete();
        }
        
        alert("Data and image successfully deleted from database/storage.");
    } catch (e) {
        console.error("Error deleting data: ", e);
        alert("Error deleting data: " + e.message);
    } finally {
        saveButton.textContent = 'Save';
        submitButton.disabled = false;
    }
}

submitButton.style.display = 'inline-block';
actionButtonsDiv.style.display = 'none';

saveButton.removeEventListener('click', handleSave);
saveButton.addEventListener('click', async () => {
    if (saveButton.textContent === 'Save') {
        await handleSave();
    } else if (saveButton.textContent === 'Delete') {
        await handleDelete();
    }
});