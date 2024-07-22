(function() {
    // External dependencies loader
    function loadExternalResource(url, type) {
        return new Promise((resolve, reject) => {
            let tag;
            if (type === 'css') {
                tag = document.createElement('link');
                tag.rel = 'stylesheet';
                tag.href = url;
            } else if (type === 'js') {
                tag = document.createElement('script');
                tag.src = url;
            }
            if (tag) {
                tag.onload = () => resolve(url);
                tag.onerror = () => reject(url);
                document.head.appendChild(tag);
            }
        });
    }

    // Load external resources
    Promise.all([
        loadExternalResource('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css', 'css'),
        loadExternalResource('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js', 'js'),
        loadExternalResource('https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js', 'js'),
        loadExternalResource('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css', 'css'),
        loadExternalResource('https://cdnjs.cloudflare.com/ajax/libs/annyang/2.6.1/annyang.min.js', 'js')
    ]).then(() => {
        initializeChat();
    }).catch(error => {
        console.error('Failed to load resources:', error);
    });

    function initializeChat() {
        const container = document.getElementById('embedded-chat');
        if (!container) {
            console.error('Chat container not found');
            return;
        }

        // Configuration object
        const config = {
            width: container.dataset.width || '300px',
            height: container.dataset.height || '400px',
            apiUrl: 'https://api.eidy.cloud/v1/chat/completions',
            bearerToken: 'float16-gyZvmO6wlR9IbVSmcK6ol57x8dflOpHZ9v0ssboRZZmJ3R8Bud' // Note: Still not secure, consider server-side handling
        };

        injectStyles(config);
        injectHTML(container);
        setupEventListeners(container, config);
    }

    function injectStyles(config) {
        const style = document.createElement('style');
        style.textContent = `
            .chat-container {
                width: ${config.width};
                height: ${config.height};
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
                height: 20px;
            }
            .typing-indicator span {
                height: 8px;
                width: 8px;
                background-color: #6c757d;
                border-radius: 50%;
                display: inline-block;
                margin-right: 5px;
                animation: typing 1s infinite ease-in-out;
            }
            .typing-indicator span:nth-child(2) {
                animation-delay: 0.2s;
            }
            .typing-indicator span:nth-child(3) {
                animation-delay: 0.4s;
            }
            @keyframes typing {
                0% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
                100% { transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    function injectHTML(container) {
        container.innerHTML = `
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
                    <small class="text-muted">v0.0.2g</small>
                </div>
            </div>
        `;
    }

    function setupEventListeners(container, config) {
        const chatMessages = container.querySelector('.chat-messages');
        const chatForm = container.querySelector('.chat-form');
        const chatInput = container.querySelector('.chat-input');
        const micButton = container.querySelector('.mic-button');
        const languageSwitch = container.querySelector('#languageSwitch');
        const stopTTSButton = container.querySelector('.stop-tts-button');

        let currentLanguage = 'en-US';
        let isRecording = false;
        let isSpeaking = false;
        let isInErrorState = false;
        let lastInputWasSpeech = false;
        let conversationHistory = [];

        const synth = window.speechSynthesis;

        // Initialize annyang
        if (annyang) {
            annyang.addCallback('result', handleSpeechResult);
            annyang.addCallback('errorNetwork', handleSpeechError);
            annyang.addCallback('errorPermissionBlocked', handleSpeechError);
            annyang.addCallback('errorPermissionDenied', handleSpeechError);
            annyang.addCallback('end', handleSpeechEnd);
        } else {
            console.error('Speech recognition is not supported in this browser.');
            micButton.style.display = 'none';
        }

        // Event listeners
        micButton.addEventListener('click', toggleSpeechRecognition);
        languageSwitch.addEventListener('change', updateLanguage);
        stopTTSButton.addEventListener('click', stopSpeech);
        chatForm.addEventListener('submit', handleFormSubmit);

        updateLanguage();

        // Speech recognition functions
        function toggleSpeechRecognition() {
            if (!isRecording) {
                startRecording();
                lastInputWasSpeech = true;
            } else {
                stopRecording();
            }
        }

        function startRecording() {
            if (!isRecording && !isSpeaking && !isInErrorState && annyang) {
                isRecording = true;
                lastInputWasSpeech = true;
                micButton.classList.add('recording');
                annyang.start({ autoRestart: false, continuous: false });
            }
        }

        function stopRecording() {
            if (isRecording && annyang) {
                isRecording = false;
                micButton.classList.remove('recording');
                annyang.abort();
            }
        }

        function handleSpeechResult(phrases) {
            if (phrases.length > 0) {
                chatInput.value = phrases[0];
                handleFormSubmit(new Event('submit'));
            }
        }

        function handleSpeechError() {
            console.error('Speech recognition error');
            stopRecording();
            isInErrorState = true;
            
            const errorMessage = currentLanguage === 'en-US' 
                ? 'Sorry, there was an error with speech recognition. Please try again by clicking the microphone button.'
                : 'ขออภัย เกิดข้อผิดพลาดในการรับรู้เสียง โปรดลองอีกครั้งโดยคลิกที่ปุ่มไมโครโฟน';
            addMessage('bot', errorMessage);
            
            lastInputWasSpeech = false;
        }

        function handleSpeechEnd() {
            stopRecording();
            if (!isSpeaking && !isInErrorState) {
                setTimeout(startRecording, 1000);
            }
        }

        // Text-to-speech functions
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

        // UI update functions
        function updateLanguage() {
            currentLanguage = languageSwitch.checked ? 'th-TH' : 'en-US';
            if (annyang) {
                annyang.setLanguage(currentLanguage);
            }
            chatInput.placeholder = currentLanguage === 'en-US' ? 'Type a message...' : 'พิมพ์ข้อความ...';
            container.querySelector('.chat-form button[type="submit"]').textContent = 
                currentLanguage === 'en-US' ? 'Send' : 'ส่ง';
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

        // API interaction
        async function sendMessageToAPI(message) {
            try {
                const response = await axios.post(config.apiUrl, {
                    messages: [...conversationHistory, { role: "user", content: message }],
                    model: "eidy",
                    max_tokens: 1024,
                    temperature: 0.1,
                    stream: false
                }, {
                    headers: {
                        'Authorization': `Bearer ${config.bearerToken}`,
                        'Content-Type': 'application/json',
                        'Accept-Language': currentLanguage.split('-')[0]
                    }
                });
                return response.data.choices[0].message.content;
            } catch (error) {
                console.error('API Error:', error);
                throw new Error('Failed to get response from API');
            }
        }

        // Form submission handler
        async function handleFormSubmit(e) {
            e.preventDefault();
            const message = chatInput.value.trim();
            if (message) {
                addMessage('user', message);
                chatInput.value = '';
                
                showTypingIndicator();
                
                try {
                    const botReply = await sendMessageToAPI(message);
                    removeTypingIndicator();
                    addMessage('bot', botReply);
                    
                    conversationHistory.push({ role: "user", content: message });
                    conversationHistory.push({ role: "assistant", content: botReply });
        
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
    }
})();