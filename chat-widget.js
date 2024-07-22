(function() {
    // Include Bootstrap CSS
    const bootstrapCSS = document.createElement('link');
    bootstrapCSS.rel = 'stylesheet';
    bootstrapCSS.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css';
    document.head.appendChild(bootstrapCSS);

    // Include Bootstrap JS
    const bootstrapJS = document.createElement('script');
    bootstrapJS.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js';
    document.body.appendChild(bootstrapJS);

    // Include Axios
    const axiosScript = document.createElement('script');
    axiosScript.src = 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';
    document.body.appendChild(axiosScript);

    // Find the container
    const container = document.getElementById('embedded-chat');
    
    // Get custom dimensions from data attributes
    const width = container.dataset.width || '300px';
    const height = container.dataset.height || '400px';

    // Create and inject custom CSS
    const style = document.createElement('style');
    style.textContent = `
        .chat-container {
            width: ${width};
            height: ${height};
            border: 1px solid #dee2e6;
            border-radius: 0.25rem;
            display: flex;
            flex-direction: column;
        }
        .chat-messages {
            flex-grow: 1;
            overflow-y: auto;
            padding: 1rem;
        }
        .chat-message {
            margin-bottom: 0.5rem;
        }
        .chat-message.user {
            text-align: right;
        }
        .chat-message.bot {
            text-align: left;
        }
        .chat-form {
            padding: 1rem;
            background-color: #f8f9fa;
            border-top: 1px solid #dee2e6;
        }
        .chat-footer {
            padding: 0.5rem 1rem;
            background-color: #f8f9fa;
            border-top: 1px solid #dee2e6;
        }
        .form-check-input {
            width: 3em;
        }
        .form-check-input:checked {
            background-color: #0d6efd;
            border-color: #0d6efd;
        }
        /* ... (rest of the existing styles) */
    `;
    document.head.appendChild(style);

    // Create chat HTML
    const chatHTML = `
    <div class="chat-container shadow d-flex flex-column">
        <div class="chat-messages flex-grow-1"></div>
        <form class="chat-form">
            <div class="input-group">
                <button class="btn btn-outline-secondary mic-button" type="button">
                    <i class="bi bi-mic"></i>
                </button>
                <input type="text" class="form-control chat-input" placeholder="Type a message...">
                <button class="btn btn-primary" type="submit">Send</button>
            </div>
        </form>
        <div class="chat-footer d-flex justify-content-end align-items-center mt-2">
            <span class="me-2">EN</span>
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="languageSwitch">
                <label class="form-check-label" for="languageSwitch">TH</label>
            </div>
        </div>
    </div>
`;

    // Inject the chat HTML
    container.innerHTML = chatHTML;

    // Chat functionality
    const chatMessages = container.querySelector('.chat-messages');
    const chatForm = container.querySelector('.chat-form');
    const chatInput = container.querySelector('.chat-input');
    const micButton = container.querySelector('.mic-button');

    // Add Bootstrap Icons CSS
    const bootstrapIcons = document.createElement('link');
    bootstrapIcons.rel = 'stylesheet';
    bootstrapIcons.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css';
    document.head.appendChild(bootstrapIcons);

    // Add styles for microphone button
    const micStyles = document.createElement('style');
    micStyles.textContent = `
        .mic-button {
            background-color: transparent;
            border: none;
            font-size: 1.2rem;
        }
        .mic-button:hover {
            color: #0d6efd;
        }
        .mic-button.recording {
            color: #dc3545;
        }
    `;
    document.head.appendChild(micStyles);

    // Speech recognition setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'th-TH';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let isRecording = false;

    micButton.addEventListener('click', toggleSpeechRecognition);

    // Add this near the top of the script, after the SpeechRecognition setup
    const synth = window.speechSynthesis;
    let lastInputWasSpeech = false;
    let isSpeaking = false;
    // Add this with other state variables
    let isInErrorState = false;

    // Add these variables after other declarations
    const languageSwitch = container.querySelector('#languageSwitch');
    let currentLanguage = 'en-US'; // Default language

    // Add event listener for language switching
    languageSwitch.addEventListener('change', function() {
        currentLanguage = this.checked ? 'th-TH' : 'en-US';
        updateLanguage();
    });

    // Add some custom CSS for the language switcher
    const switchStyles = document.createElement('style');
    switchStyles.textContent = `
        .language-switcher .form-check-input {
            width: 3em;
        }
        .language-switcher .form-check-input:checked {
            background-color: #0d6efd;
            border-color: #0d6efd;
        }
    `;
    document.head.appendChild(switchStyles);

   // Function to update language-dependent elements
    function updateLanguage() {
        recognition.lang = currentLanguage;
        chatInput.placeholder = currentLanguage === 'en-US' ? 'Type a message...' : 'พิมพ์ข้อความ...';
        container.querySelector('.chat-form button[type="submit"]').textContent = 
            currentLanguage === 'en-US' ? 'Send' : 'ส่ง';
    }

    // Modify the speakText function
    function speakText(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLanguage;  // Set language to Thai
        
        utterance.onstart = () => {
            isSpeaking = true;
        };
        
        utterance.onend = () => {
            isSpeaking = false;
            // Only start recording if not in error state
            if (!isInErrorState) {
                setTimeout(() => {
                    if (!isRecording && !isSpeaking) {
                        startRecording();
                    }
                }, 1000);
            }
        };
        
        synth.speak(utterance);
    }

    function toggleSpeechRecognition() {
        if (!isRecording) {
            startRecording();
            lastInputWasSpeech = true;
        } else {
            stopRecording();
        }
    }

    function startRecording() {
        if (!isRecording && !isSpeaking && !isInErrorState) {
            isRecording = true;
            lastInputWasSpeech = true;
            micButton.classList.add('recording');
            recognition.start();
        }
    }    

    function stopRecording() {
        if (isRecording) {
            isRecording = false;
            micButton.classList.remove('recording');
            recognition.stop();
        }
    }

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        stopRecording();
        isInErrorState = true;
        
        const errorMessage = currentLanguage === 'en-US' 
            ? 'Sorry, there was an error with speech recognition. Please try again by clicking the microphone button.'
            : 'ขออภัย เกิดข้อผิดพลาดในการรับรู้เสียง โปรดลองอีกครั้งโดยคลิกที่ปุ่มไมโครโฟน';
        addMessage('bot', errorMessage);
        
        lastInputWasSpeech = false;
    };

    updateLanguage();

    recognition.onend = function() {
        stopRecording();
        if (chatInput.value.trim()) {
            chatForm.dispatchEvent(new Event('submit'));
        } else if (!isSpeaking && !isInErrorState) {
            // Only start recording again if not in error state
            setTimeout(startRecording, 1000);
        }
    };

    micButton.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
        } else {
            isInErrorState = false;  // Reset error state when manually starting
            startRecording();
        }
    });

    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (message) {
            addMessage('user', message);
            chatInput.value = '';
            
            showTypingIndicator();
            
            try {
                const response = await sendMessageToAPI(message);
                const botReply = response.data.choices[0].message.content;
                removeTypingIndicator();
                addMessage('bot', botReply);
                
                if (lastInputWasSpeech) {
                    speakText(botReply);
                } else {
                    // If it wasn't speech input, reset lastInputWasSpeech
                    lastInputWasSpeech = false;
                }
            } catch (error) {
                console.error('Error:', error);
                removeTypingIndicator();
                addMessage('bot', 'Sorry, I encountered an error. Please try again.');
            }
        }
    });

    // Modify the sendMessageToAPI function
    async function sendMessageToAPI(message) {
        const apiUrl = 'https://api.eidy.cloud/v1/chat/completions';
        const bearerToken = 'float16-gyZvmO6wlR9IbVSmcK6ol57x8dflOpHZ9v0ssboRZZmJ3R8Bud';

        const data = {
            messages: [{
                role: "user",
                content: message
            }],
            model: "eidy",
            max_tokens: 1024,
            temperature: 0.1,
            stream: false
        };

        const config = {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
                'Accept-Language': currentLanguage.split('-')[0] // 'en' or 'th'
            }
        };

        return axios.post(apiUrl, data, config);
    }

    function addMessage(sender, text) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}`;
        messageElement.innerHTML = `
            <strong>${sender === 'user' ? (currentLanguage === 'en-US' ? 'You' : 'คุณ') : 'Bot'}:</strong>
            <span>${text}</span>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingIndicator = chatMessages.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
})();