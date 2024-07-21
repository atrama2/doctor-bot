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
        .typing-indicator {
            display: flex;
            padding: 0.5rem;
            background-color: #f0f0f0;
            border-radius: 1rem;
            margin-bottom: 0.5rem;
        }
        .typing-indicator span {
            height: 0.5rem;
            width: 0.5rem;
            background-color: #333;
            border-radius: 50%;
            display: inline-block;
            margin-right: 0.25rem;
            animation: typing 1s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
        }
        .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
        }
        @keyframes typing {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0px); }
        }
    `;
    document.head.appendChild(style);

    // Create chat HTML
    const chatHTML = `
        <div class="chat-container shadow">
            <div class="chat-messages"></div>
            <form class="chat-form">
                <div class="input-group">
                    <button class="btn btn-outline-secondary mic-button" type="button">
                        <i class="bi bi-mic"></i>
                    </button>
                    <input type="text" class="form-control chat-input" placeholder="Type a message...">
                    <button class="btn btn-primary" type="submit">Send</button>
                </div>
            </form>
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
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let isRecording = false;

    micButton.addEventListener('click', toggleSpeechRecognition);

    function toggleSpeechRecognition() {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    }

    function startRecording() {
        isRecording = true;
        micButton.classList.add('recording');
        recognition.start();
    }

    function stopRecording() {
        isRecording = false;
        micButton.classList.remove('recording');
        recognition.stop();
    }

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        stopRecording();
    };

    recognition.onend = function() {
        stopRecording();
    };

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
            } catch (error) {
                console.error('Error:', error);
                removeTypingIndicator();
                addMessage('bot', 'Sorry, I encountered an error. Please try again.');
            }
        }
    });

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
                'Content-Type': 'application/json'
            }
        };

        return axios.post(apiUrl, data, config);
    }

    function addMessage(sender, text) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}`;
        messageElement.innerHTML = `
            <strong>${sender === 'user' ? 'You' : 'Bot'}:</strong>
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