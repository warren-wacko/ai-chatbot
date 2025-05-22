import { model } from './mainmodule.js';

const chatInput = document.querySelector('#chat-input');
const messageContainer = document.querySelector('.message-container');
let abortChat = false;
// List of words associated with moods
const moodKeywords = {
    excited: {
        words: ["amazing", "awesome", "fantastic", "great", "incredible", "yay", "right", "energetic", "hyped", "thrilled", "ecstatic"]
    },
    happy: {
        words: ["happy", "glad", "joy", "love", "smile", "good", "nice", "normal", "cheerful", "content", "grateful", "delighted"]
    },
    playful: {
        words: ["fun", "mischievous", "tricky", "prank", "joke", "tease", "silly", "goofy"],
    },
    neutral: {
        words: ["okay", "alright", "hmm", "fine", "whatever", "calm", "indifferent", "meh", "new stage"]
    },
    sad: {
        words: ["sad", "unhappy", "depressed", "cry", "bad", "lonely", "upset", "blue", "miserable"]
    },
    sleepy: {
        words: ["tired", "sleepy", "exhausted", "lazy", "drowsy"]
    },
    angry: {
        words: ["angry", "mad", "furious", "hate", "annoyed", "frustrated", "irritated", "rage", "boiling", "angry", "mistake"]
    },
    dark: {
        words: ["evil", "dark", "menacing", "scary", "terrifying", "anger", "malicious"]
    },
    powerful: {
        words: ["poisonous", "dangerous", "intense", "strong", "fearsome", "poison1", "poison2", "poison3"]
    },
    shock: {
        words: ["shocked", "surprised", "stunned", "speechless", "gasp", "startled", "jolted"]
    }

};

// Function to detect mood from message
function getMoodFromMessage(message) {
    message = message.toLowerCase();
    for (const mood in moodKeywords) {
        for (const word of moodKeywords[mood].words) {
            if (message.includes(word)) {
                return { mood, color: moodKeywords[mood].color };
            }
        }
    }
    return { mood: "neutral", color: "#fdfd96" }; // Default if no keywords are found
}

// Function to change Koro's mood with smooth transition
// Updated changeMood function
function changeMood({ mood }) {
    const koroImage = document.querySelector(".ai-persona img");

    const moodFilters = {
        excited: "brightness(120%) contrast(120%) saturate(200%) hue-rotate(-40deg)", // Pure orange
        happy: "brightness(120%) contrast(110%) saturate(250%) hue-rotate(0deg)", // True bright yellow
        playful: "brightness(120%) contrast(130%) saturate(200%) hue-rotate(60deg)", // Yellow with green tint
        neutral: "brightness(100%) contrast(100%) saturate(100%) hue-rotate(0deg)", // Pale yellow
        sad: "brightness(100%) saturate(150%) hue-rotate(160deg)", // Closer to #87ceeb
        sleepy: "brightness(80%) contrast(90%) saturate(120%) hue-rotate(270deg)", // Soft purple
        angry: "brightness(150%) contrast(300%) saturate(700%) hue-rotate(-55deg)", // Fiery red
        dark: "brightness(30%) contrast(200%) saturate(400%) grayscale(100%)", // Black
        powerful: "brightness(130%) contrast(150%) saturate(300%) hue-rotate(55deg)", // Bright yellow
        shock: "brightness(80%) saturate(50%) hue-rotate(170deg)",
    };

    if (!moodFilters[mood]) return;

    // Reset the filter to force re-render
    koroImage.style.transition = "none";
    koroImage.style.filter = "none";

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            setTimeout(() => {
                koroImage.style.transition = "filter 1.5s ease-in-out, background-color 1.5s ease-in-out";
                koroImage.style.filter = moodFilters[mood];
            }, 10);
        });
    });
}

// Function to create chat message bubbles (with markdown)
function createMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-content', isUser ? 'user-message' : 'ai-message');

    const iconSrc = isUser ? 'pfp.jpg' : 'sensei-icon.png';
    const iconAlt = isUser ? 'User' : 'Koro-sensei';

    text = text.replace(/^./, text[0].toUpperCase());

    if (isUser) {
        messageDiv.innerHTML = `
            <div class='chat-body-inner right'>
                <p>${text}</p>
                <div class="message-timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <img src="${iconSrc}" alt="${iconAlt}" class="chat-icon user-icon">
        `;
    } else {
        messageDiv.innerHTML = `
            <img src="${iconSrc}" alt="${iconAlt}" class="chat-icon">
            <div class='chat-body-inner left'>
                <p style="color: white; display: inline;">${marked.parse(text)}</p>  <!-- Parse AI response as Markdown -->
                <div class="message-timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        `;
    }

    return messageDiv;
}

// Show "typing" indicator
function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('typing-indicator');
    typingDiv.textContent = 'Koro-Sensei is thinking...';
    typingDiv.id = 'typing-indicator';
    messageContainer.appendChild(typingDiv);
}

// Remove "typing" indicator
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) typingIndicator.remove();
}

// Function to send Koro-Sensei’s response in parts
async function sendKoroResponse(response) {
    const sentences = response.split(/(?<!\d)\.(?=\s+|$)|(?<=[!?])\s+/)
                              .filter(sentence => sentence.trim() !== '');

    for (const sentence of sentences) {
        if (abortChat) return; // Stop sending messages if a new chat is started
        await new Promise(resolve => setTimeout(resolve, 1000));
        messageContainer.appendChild(createMessage(sentence, false));
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
}


// Function to handle sending messages
async function handleSubmit() {
    const userText = chatInput.value.trim();
    if (!userText) return;

    // Disable input and button
    chatInput.disabled = true;
    document.querySelector("#paper-plane").disabled = true;

    const bubbles = document.querySelectorAll(".chat-bubble");
    bubbles.forEach(bubble => bubble.remove());

    // Add user message to chat
    messageContainer.appendChild(createMessage(userText, true));
   
    // Ensure it scrolls to the latest message
    setTimeout(() => {
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 10);

    chatInput.value = '';

    // Detect user's mood and change Koro's color
    const userMood = getMoodFromMessage(userText);
    changeMood(userMood);

    // Show typing indicator
    addTypingIndicator();

    try {
        const result = await model.generateContent(userText);
        const response = await result.response.text();

        removeTypingIndicator();

        // Send Koro-Sensei's response in parts
        await sendKoroResponse(response);

    } catch (error) {
        removeTypingIndicator();
        messageContainer.appendChild(createMessage(`Error: ${error.message}`, false));
    }

    // Scroll to bottom again after AI response
    setTimeout(() => {
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 10);

    // Re-enable input and button
    chatInput.disabled = false;
    document.querySelector("#paper-plane").disabled = false;
    chatInput.focus(); // Focus back on the input field

    // Clear input field and reset height
    chatInput.value = '';
    chatInput.style.height = '36px'; // Reset to default height
}

const korosensei = document.getElementById('korosensei');

// ilag moves ni koro
korosensei.addEventListener('mousemove', (e) => {
    const offsetX = (Math.random() * 1000 - 500); // Random dodge movement
    const offsetY = (Math.random() * 800 - 500);

    korosensei.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
});

// pang balik sa position
korosensei.addEventListener('mouseleave', () => {
    korosensei.style.transform = 'translate(0, 0)';
});


// Connect mood detection to both user input and AI replies
document.querySelector("#paper-plane").addEventListener("click", handleSubmit);

// Event listener for pressing "Enter" to send messages
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
             // Clear input field and reset height
     chatInput.value = '';
     chatInput.style.height = '36px'; // Reset to default height
    }
});

// Auto-resize input field
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';

    if (chatInput.value.trim() === '') {
        chatInput.style.height = '36px';
    }
});

async function getRandomPrompts() {
    const promptRequest = "Generate four random questions prompts for Koro-Sensei, each in exactly one concise sentence. Do not include numbers, lists, or unnecessary dialogue.";
   
    const response = await model.generateContent(promptRequest);
    const text = await response.response.text(); // Extract response text

    // Use regex to extract clean, single sentences
    const sentences = text.match(/[^.!?]+[.!?]/g) || []; // Match full sentences

    // for four prompts
    return sentences.slice(0, 4).map(sentence => sentence.trim());
}

async function generateAndDisplay() {
    try {
        const prompts = await getRandomPrompts();
        console.log("Generated Prompts:", prompts);

        const messageContainer = document.querySelector(".message-container");
        messageContainer.innerHTML = ""; 

        prompts.forEach(prompt => {
            const bubble = document.createElement("div");
            bubble.classList.add("chat-bubble");
            bubble.textContent = prompt;

            // send the prompt when clicked
            bubble.addEventListener("click", function () {
                sendMessage(prompt);
            });

            messageContainer.appendChild(bubble);
        });

    } catch (error) {
        console.error("Error:", error);
    }
}

async function sendMessage(message) {
    if (!message) return;

    // Disable input and button
    chatInput.disabled = true;
    document.querySelector("#paper-plane").disabled = true;

    // Clear only the prompt bubbles, but keep existing messages
    const bubbles = document.querySelectorAll(".chat-bubble");
    bubbles.forEach(bubble => bubble.remove());

    // Add the selected prompt as a user message
    messageContainer.appendChild(createMessage(message, true));

    // Detect mood and change Koro-sensei's expression
    const userMood = getMoodFromMessage(message);
    changeMood(userMood);

    // Show typing indicator
    addTypingIndicator();

    try {
        const result = await model.generateContent(message);
        const response = await result.response.text();

        removeTypingIndicator();

        // Send Koro-Sensei's response in parts
        await sendKoroResponse(response);

    } catch (error) {
        removeTypingIndicator();
        messageContainer.appendChild(createMessage(`Error: ${error.message}`, false));
    }

    // Scroll to bottom
    messageContainer.scrollTop = messageContainer.scrollHeight;

    // Re-enable input and button once response is done
    chatInput.disabled = false;
    document.querySelector("#paper-plane").disabled = false;
    chatInput.focus(); // Focus back on input field
}

// Load prompts when the page loads
window.onload = generateAndDisplay;


document.querySelector(".plus-btn").addEventListener("click", handleNewChat);


async function handleNewChat() {
    abortChat = true; // Stop any ongoing responses immediately

    // Clear chat and reset mood
    const koroImage = document.querySelector(".ai-persona img");
    const messageContainer = document.querySelector(".message-container");
    messageContainer.innerHTML = ""; // Clear chat history

    const chatInput = document.querySelector("#chat-input");
    chatInput.value = "";

    koroImage.style.transition = "none";
    koroImage.style.filter = "none";

    console.log("New chat started!");

    // Reset abort flag after a short delay
    setTimeout(() => {
        abortChat = false;
    }, 1000);

    await generateAndDisplay();
}