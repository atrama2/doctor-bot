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
        loadExternalResource('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css', 'css')
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
            height: container.dataset.height || '400px',
            apiUrl: 'https://api.eidy.cloud/v1/chat/completions',
            bearerToken: 'float16-gyZvmO6wlR9IbVSmcK6ol57x8dflOpHZ9v0ssboRZZmJ3R8Bud'
        };
    
        injectStyles(config);
        injectHTML(container);
        setupEventListeners(container, config);
    }

    function injectStyles(config) {
        const style = document.createElement('style');
        style.textContent = `
            .video-container {
                position: relative;
                padding-bottom: 56.25%; /* 16:9 aspect ratio */
                height: 0;
                overflow: hidden;
            }
            .video-container iframe {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }
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
            <div class="container-fluid">
                <div class="row">
                    <div class="col-6">
                        <div class="video-container">
                            <iframe allow="camera; microphone; fullscreen; display-capture; autoplay" src="https://con.defence-innovation.com/1675/90" style="height: 100%; width: 100%; border: 0px;"></iframe>
                        </div>
                    </div>
                    <div class="col-3">
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
                                <small class="text-muted">v0.0.2n</small>
                            </div>
                        </div>
                    </div>
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
        const RECORDING_TIMEOUT = 5000; // 5 seconds

        let currentLanguage = 'en-US';
        let isRecording = false;
        let isSpeaking = false;
        let isInErrorState = false;
        let lastInputWasSpeech = false;
        let conversationHistory = [];
        let isWaitingForAPI = false;

        const synth = window.speechSynthesis;
        let recognition;

        // Initialize Web Speech API
        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onresult = handleSpeechResult;
            recognition.onerror = handleSpeechError;
            recognition.onend = handleSpeechEnd;
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

        let recordingTimeout;

        function startRecording() {
            if (!isRecording && !isSpeaking && !isInErrorState && !isWaitingForAPI && recognition) {
                isRecording = true;
                lastInputWasSpeech = true;
                micButton.classList.add('recording');
                recognition.lang = currentLanguage;
                recognition.start();

                // Set a timeout to stop recording after RECORDING_TIMEOUT milliseconds
                recordingTimeout = setTimeout(() => {
                    if (isRecording) {
                        stopRecording();
                    }
                }, RECORDING_TIMEOUT);
            }
        }

        function stopRecording() {
            if (isRecording && recognition) {
                isRecording = false;
                micButton.classList.remove('recording');
                recognition.stop();
                clearTimeout(recordingTimeout);
            }
        }

        function handleSpeechResult(event) {
            const last = event.results.length - 1;
            const text = event.results[last][0].transcript;

            chatInput.value = text;
            stopRecording();
            handleFormSubmit(new Event('submit'));
        }

        function handleSpeechError(event) {
            console.error('Speech recognition error', event.error);
            stopRecording();
            isInErrorState = true;
            
            const errorMessage = currentLanguage === 'en-US' 
                ? 'Sorry, there was an error with speech recognition. Please try again by clicking the microphone button.'
                : 'ขออภัย เกิดข้อผิดพลาดในการรับรู้เสียง โปรดลองอีกครั้งโดยคลิกที่ปุ่มไมโครโฟน';
            addMessage('bot', errorMessage);
            
            lastInputWasSpeech = false;

            // Reset the error state after a short delay
            setTimeout(() => {
                isInErrorState = false;
            }, 2000);
        }

        function handleSpeechEnd() {
            stopRecording();
            if (!isSpeaking && !isInErrorState && !isWaitingForAPI) {
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
                if (!isInErrorState && !isWaitingForAPI) {
                    setTimeout(() => {
                        if (!isRecording && !isSpeaking && !isWaitingForAPI) {
                            startRecording();
                        }
                    }, 1000);
                }
            };
            
            utterance.onerror = (event) => {
                console.error('Text-to-speech error:', event);
                addMessage('bot', 'Sorry, there was an error with text-to-speech. Please read the message instead.');
                isSpeaking = false;
                stopTTSButton.style.display = 'none';
            };
            
            synth.speak(utterance);
        }

        function stopSpeech() {
            if (synth.speaking) {
                synth.cancel();
                isSpeaking = false;
                stopTTSButton.style.display = 'none';
                if (!isInErrorState && !isWaitingForAPI) {
                    setTimeout(startRecording, 1000);
                }
            }
        }

        // UI update functions
        function updateLanguage() {
            currentLanguage = languageSwitch.checked ? 'th-TH' : 'en-US';
            if (recognition) {
                recognition.lang = currentLanguage;
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
                let modifiedMessage = message;
                if (currentLanguage === 'th-TH') {
                    modifiedMessage += " ตอบเป็นภาษาไทย";
                }
        
                const response = await axios.post(config.apiUrl, {
                    messages: [...conversationHistory, { role: "user", content: modifiedMessage }],
                    model: "eidy",
                    max_tokens: 512,
                    temperature: 0.4,
                    stream: false,
                    random_seed: Math.floor(Math.random() * 10)
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
                isWaitingForAPI = true;
                
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
                } finally {
                    isWaitingForAPI = false;
                }
            }
        }
    }
})();