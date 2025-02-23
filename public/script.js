document.addEventListener("DOMContentLoaded", () => {
  // Shared DOM elements
  const outputContainer = document.querySelector('.llm-output');
  const inputField = document.querySelector('.input-container input');

  /* === GRID GENERATION CODE === */
  const gridContainer = document.querySelector(".grid-container");
  const gridColumns = 30;
  const gridRows = 30;
  const totalCells = gridColumns * gridRows;
  
  // Define the center region for grid items.
  const centerStartRow = 12;
  const centerEndRow = 17;
  const centerStartCol = 12;
  const centerEndCol = 17;
  
  // Delay factor for wave animation.
  const factor = 0.05;
  
  // Formulas for multidirectional delay.
  const formulas = [
    (row, col) => row + col,
    (row, col) => row + (gridColumns - col),
    (row, col) => row,
    (row, col) => col
  ];
  
  // Create grid items.
  for (let i = 0; i < totalCells; i++) {
    const gridItem = document.createElement("div");
    gridItem.classList.add("grid-item");
    const row = Math.floor(i / gridColumns);
    const col = i % gridColumns;
    if (
      row >= centerStartRow && row <= centerEndRow &&
      col >= centerStartCol && col <= centerEndCol
    ) {
      gridItem.style.animationName = "none";
    } else {
      const formula = formulas[Math.floor(Math.random() * formulas.length)];
      const delay = formula(row, col) * factor;
      gridItem.style.animationDelay = `${delay}s`;
    }
    gridContainer.appendChild(gridItem);
  }
  
  /* === DEMO NOTIFICATION CLOSE BUTTON === */
  const demoClose = document.getElementById("demo-close");
  demoClose.addEventListener("click", () => {
    document.getElementById("demo-notification").style.display = "none";
  });
  
  /* === CHAT API INTEGRATION USING GEMINI === */
  async function fetchChatResponse(prompt) {
    try {
        const response = await fetch('/api/chat', {  // Call your backend, NOT Gemini directly
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Received response from backend:", data);
        return data.response || "No response received.";
    } catch (error) {
        console.error('Error fetching chat response:', error);
        return "Sorry, an error occurred while fetching a response.";
    }
}

  
  function extractResponseContent(data) {
    if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
      const firstCandidate = data.candidates[0];
      if (
        firstCandidate.content &&
        firstCandidate.content.parts &&
        Array.isArray(firstCandidate.content.parts) &&
        firstCandidate.content.parts.length > 0 &&
        firstCandidate.content.parts[0].text
      ) {
        return firstCandidate.content.parts[0].text;
      } else {
        console.warn("Unexpected 'candidates' structure:", data);
      }
    } else if (
      data.choices && Array.isArray(data.choices) && data.choices.length > 0 &&
      data.choices[0].message && data.choices[0].message.content
    ) {
      return data.choices[0].message.content;
    } else {
      console.warn("Unexpected response structure:", data);
    }
    return "No valid response returned.";
  }
  
  /* === FILE ATTACHMENT FEATURE === */
  // Trigger file selection when the paperclip icon is clicked.
  const fileAttachBtn = document.getElementById("file-attach-btn");
  const fileUpload = document.getElementById("file-upload");
  const attachmentPreview = document.getElementById("attachment-preview");
  const attachmentInfo = document.getElementById("attachment-info");
  const attachmentPrompt = document.getElementById("attachment-prompt");
  const sendAttachmentBtn = document.getElementById("send-attachment-btn");
  
  fileAttachBtn.addEventListener("click", () => {
    fileUpload.click();
  });
  
  // When a file is selected, show a preview and prompt input.
  fileUpload.addEventListener("change", () => {
    if (fileUpload.files.length === 0) return;
    const file = fileUpload.files[0];
    if (attachmentPreview) {
      attachmentPreview.style.display = "block";
    }
    
    // Display basic file info.
    let previewHTML = `<strong>File:</strong> ${file.name} (${file.type || "Unknown type"})`;
    if (attachmentInfo) {
      attachmentInfo.innerHTML = previewHTML;
    }
    
    // If it's an image, display a thumbnail.
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = function(e) {
        if (attachmentInfo) {
          attachmentInfo.innerHTML += `<br><img src="${e.target.result}" alt="Image preview" style="max-width: 100%; height: auto;">`;
        }
      };
      reader.readAsDataURL(file);
    }
  });
  
  // When "Send Attachment" is clicked, process the file with the prompt.
  sendAttachmentBtn.addEventListener("click", async () => {
    if (fileUpload.files.length === 0) return;
    const file = fileUpload.files[0];
    let prompt = attachmentPrompt.value.trim();
    
    let fileText = "";
    if (file.type === "application/pdf") {
      const fileReader = new FileReader();
      fileReader.onload = async function() {
        const typedarray = new Uint8Array(this.result);
        try {
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ");
            fileText += pageText + "\n";
          }
          const combinedPrompt = (prompt ? prompt + "\n" : "") + fileText;
          const response = await fetchChatResponse(combinedPrompt);
          const attachmentResponseElem = document.createElement('p');
          attachmentResponseElem.style.fontWeight = 'bold';
          attachmentResponseElem.textContent = "Attachment Response: " + response;
          outputContainer.appendChild(attachmentResponseElem);
          attachmentPreview.style.display = "none";
          attachmentPrompt.value = "";
          fileUpload.value = "";
        } catch (error) {
          console.error("Error extracting PDF text:", error);
          alert("Error extracting PDF text.");
        }
      };
      fileReader.readAsArrayBuffer(file);
    } else {
      const combinedPrompt = (prompt ? prompt + "\n" : "") + "Attached file: " + file.name;
      const response = await fetchChatResponse(combinedPrompt);
      const attachmentResponseElem = document.createElement('p');
      attachmentResponseElem.style.fontWeight = 'bold';
      attachmentResponseElem.textContent = "Attachment Response: " + response;
      outputContainer.appendChild(attachmentResponseElem);
      attachmentPreview.style.display = "none";
      attachmentPrompt.value = "";
      fileUpload.value = "";
    }
    outputContainer.scrollTop = outputContainer.scrollHeight;
  });
  
  /* === CHAT INTERFACE INTEGRATION === */
  inputField.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter' && inputField.value.trim() !== '') {
      const userInput = inputField.value.trim();
      
      // Append user's message to the history.
      const userElem = document.createElement('p');
      userElem.style.fontWeight = 'bold';
      userElem.textContent = "You: " + userInput;
      outputContainer.appendChild(userElem);
      
      // Fetch response from Gemini's API.
      const response = await fetchChatResponse(userInput);
      
      // Append the model's response to the history.
      const responseElem = document.createElement('p');
      responseElem.textContent = "Model-0mini: " + response;
      outputContainer.appendChild(responseElem);
      
      inputField.value = '';
      outputContainer.scrollTop = outputContainer.scrollHeight;
    }
  });
});
