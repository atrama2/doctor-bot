(function() {
    // Include external resources
    const resources = [
        { type: 'link', rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css' },
        { type: 'link', rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css' },
        { type: 'script', src: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js' },
        { type: 'script', src: 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js' }
    ];

    resources.forEach(resource => {
        const element = document.createElement(resource.type === 'link' ? 'link' : 'script');
        Object.assign(element, resource);
        (resource.type === 'link' ? document.head : document.body).appendChild(element);
    });

    // Find the container and get custom dimensions
    const container = document.getElementById('embedded-chat');
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
        .typing-indicator {
            display: flex;
            justify-content: flex-start;
            align-items: center;
        }
        .typing-indicator span {
            height: 10px;
            width: 10px;
            float: left;
            margin: 0 1px;
            background-color: #9E9EA1;
            display: block;
            border-radius: 50%;
            opacity: 0.4;
            animation: typing 1s infinite;
        }
        @keyframes typing {
            0% { transform: translateY(0px); }
            28% { transform: translateY(-7px); }
            44% { transform: translateY(0px); }
        }
        .typing-indicator span:nth-of-type(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-of-type(3) { animation-delay: 0.4s; }
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
        <div class="chat-footer d-flex justify-content-between align-items-center mt-2">
            <button class="btn btn-sm btn-danger stop-tts-button" style="display: none;">Stop Speech</button>
            <div class="d-flex align-items-center">
                <span class="me-2">EN</span>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="languageSwitch">
                    <label class="form-check-label" for="languageSwitch">TH</label>
                </div>
            </div>
            <small class="text-muted">v0.0.2b</small>
        </div>
    </div>
    `;

    // Inject the chat HTML
    container.innerHTML = chatHTML;

    // Chat elements
    const chatMessages = container.querySelector('.chat-messages');
    const chatForm = container.querySelector('.chat-form');
    const chatInput = container.querySelector('.chat-input');
    const micButton = container.querySelector('.mic-button');
    const languageSwitch = container.querySelector('#languageSwitch');
    const stopTTSButton = container.querySelector('.stop-tts-button');

    // Speech recognition setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // Speech synthesis setup
    const synth = window.speechSynthesis;

    // State variables
    let isRecording = false;
    let lastInputWasSpeech = false;
    let isSpeaking = false;
    let isInErrorState = false;
    let currentLanguage = 'en-US';
    let conversationHistory = [];

    // Event listeners
    micButton.addEventListener('click', toggleSpeechRecognition);
    languageSwitch.addEventListener('change', updateLanguage);
    stopTTSButton.addEventListener('click', stopSpeech);
    chatForm.addEventListener('submit', handleChatSubmit);

    // Functions
    function toggleSpeechRecognition() {
        if (isRecording) {
            stopRecording();
        } else {
            isInErrorState = false;
            startRecording();
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

    function updateLanguage() {
        currentLanguage = languageSwitch.checked ? 'th-TH' : 'en-US';
        recognition.lang = currentLanguage;
        chatInput.placeholder = currentLanguage === 'en-US' ? 'Type a message...' : 'พิมพ์ข้อความ...';
        container.querySelector('.chat-form button[type="submit"]').textContent = 
            currentLanguage === 'en-US' ? 'Send' : 'ส่ง';
    }

    function speakText(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLanguage;
        
        utterance.onstart = () => {
            isSpeaking = true;
            stopTTSButton.style.display = 'block';
        };
        
        utterance.onend = () => {
            isSpeaking = false;
            stopTTSButton.style.display = 'none';
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

    function stopSpeech() {
        if (synth.speaking) {
            synth.cancel();
            isSpeaking = false;
            stopTTSButton.style.display = 'none';
            if (!isInErrorState) {
                setTimeout(startRecording, 1000);
            }
        }
    }

    async function handleChatSubmit(e) {
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
                
                conversationHistory.push({
                    role: "assistant",
                    content: botReply
                });
    
                if (lastInputWasSpeech) {
                    if (synth.speaking) {
                        synth.cancel();
                    }
                    speakText(botReply);
                } else {
                    lastInputWasSpeech = false;
                }
            } catch (error) {
                console.error('Error:', error);
                removeTypingIndicator();
                addMessage('bot', 'Sorry, I encountered an error. Please try again.');
            }
        }
    }

    async function sendMessageToAPI(message) {
        const apiUrl = 'https://api.eidy.cloud/v1/chat/completions';
        const bearerToken = 'float16-gyZvmO6wlR9IbVSmcK6ol57x8dflOpHZ9v0ssboRZZmJ3R8Bud';
    
        conversationHistory.push({
            role: "user",
            content: message
        });
    
        const data = {
            messages: conversationHistory,
            model: "eidy",
            max_tokens: 1024,
            temperature: 0.1,
            stream: false
        };
    
        const config = {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
                'Accept-Language': currentLanguage.split('-')[0]
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

    // Speech recognition event handlers
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

    recognition.onend = function() {
        stopRecording();
        if (chatInput.value.trim()) {
            chatForm.dispatchEvent(new Event('submit'));
        } else if (!isSpeaking && !isInErrorState) {
            setTimeout(startRecording, 1000);
        }
    };

    // Initialize
    updateLanguage();
})();