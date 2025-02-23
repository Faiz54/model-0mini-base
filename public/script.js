document.addEventListener("DOMContentLoaded", () => {
    const outputContainer = document.querySelector('.llm-output');
    const inputField = document.querySelector('.input-container input');
    const gridContainer = document.querySelector(".grid-container");
    const gridColumns = 30, gridRows = 30, totalCells = gridColumns * gridRows;
    const centerStartRow = 12, centerEndRow = 17, centerStartCol = 12, centerEndCol = 17;
    const factor = 0.05;
    const formulas = [
      (row, col) => row + col,
      (row, col) => row + (gridColumns - col),
      (row, col) => row,
      (row, col) => col
    ];
    for (let i = 0; i < totalCells; i++) {
      const gridItem = document.createElement("div");
      gridItem.classList.add("grid-item");
      const row = Math.floor(i / gridColumns), col = i % gridColumns;
      if (row >= centerStartRow && row <= centerEndRow && col >= centerStartCol && col <= centerEndCol) {
        gridItem.style.animationName = "none";
      } else {
        const delay = formulas[Math.floor(Math.random() * formulas.length)](row, col) * factor;
        gridItem.style.animationDelay = `${delay}s`;
      }
      gridContainer.appendChild(gridItem);
    }
    document.getElementById("demo-close").addEventListener("click", () => {
      document.getElementById("demo-notification").style.display = "none";
    });
    async function fetchChatResponse(prompt) {
      try {
        const response = await fetch("https://model-0mini-base-production.up.railway.app/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log("Received response from backend:", data);
        return data.response || "No response received.";
      } catch (error) {
        console.error("Error fetching chat response:", error);
        return "Sorry, an error occurred while fetching a response.";
      }
    }
    function formatResponse(text) {
      return text.replace(/\n/g, "<br>")
                 .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                 .replace(/\*(.*?)\*/g, "<em>$1</em>")
                 .replace(/- (.*?)\n/g, "• $1<br>");
    }
    inputField.addEventListener("keydown", async (event) => {
      if (event.key === "Enter" && inputField.value.trim() !== "") {
        const userInput = inputField.value.trim();
        const userElem = document.createElement("p");
        userElem.style.fontWeight = "bold";
        userElem.textContent = "You: " + userInput;
        outputContainer.appendChild(userElem);
        const responseText = await fetchChatResponse(userInput);
        const responseElem = document.createElement("p");
        responseElem.innerHTML = "Model‑0mini: <br>" + formatResponse(responseText);
        outputContainer.appendChild(responseElem);
        inputField.value = "";
        outputContainer.scrollTop = outputContainer.scrollHeight;
      }
    });
  });
  