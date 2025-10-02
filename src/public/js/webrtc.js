class WebRTCManager {
    constructor() {
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.localAudioContext = null;
        this.remoteAudioContext = null;
        this.localAnalyser = null;
        this.remoteAnalyser = null;
        this.isInitiator = false;
        
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        };
    }

    async initialize() {
        try {
            console.log('🎤 Requesting microphone access...');
            
            // Request microphone with mobile-friendly constraints
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100,
                    channelCount: 1
                },
                video: false
            };
            
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('✅ Microphone access granted');
            console.log('📊 Audio tracks:', this.localStream.getAudioTracks().length);
            
            // Set up local audio playback
            await this.setupLocalAudio();
            
            // Create peer connection
            this.createPeerConnection();
            
            // Add audio tracks to peer connection
            this.localStream.getTracks().forEach(track => {
                console.log('📡 Adding audio track:', track.label);
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            // Set up audio visualization
            this.setupAudioVisualization();
            
            return true;
        } catch (error) {
            console.error('❌ Microphone access error:', error);
            this.showErrorMessage('Microphone access required: ' + error.message);
            return false;
        }
    }

    async setupLocalAudio() {
        const localAudio = document.getElementById('localAudio');
        if (localAudio) {
            try {
                localAudio.srcObject = this.localStream;
                // Ensure local audio plays (for monitoring)
                await localAudio.play();
                console.log('🔊 Local audio setup complete');
            } catch (error) {
                console.log('Local audio play error (expected):', error);
            }
        }
    }

    createPeerConnection() {
        console.log('🔗 Creating WebRTC peer connection...');
        this.peerConnection = new RTCPeerConnection(this.configuration);
        
        // Handle remote tracks (when other person speaks)
        this.peerConnection.ontrack = (event) => {
            console.log('🎧 Received remote track:', event.track.kind);
            
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
                this.setupRemoteAudio();
            }
        };
        
        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('📡 Sending ICE candidate');
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    to: currentPeerId
                });
            }
        };
        
        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log('📶 Connection state:', state);
            
            switch(state) {
                case 'connected':
                    console.log('✅ Voice connection established!');
                    this.onConnectionEstablished();
                    break;
                case 'disconnected':
                case 'failed':
                    console.log('❌ Voice connection lost');
                    this.onConnectionLost();
                    break;
            }
        };
        
        // Handle ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('🧊 ICE connection state:', this.peerConnection.iceConnectionState);
        };
    }

    async setupRemoteAudio() {
        const remoteAudio = document.getElementById('remoteAudio');
        if (remoteAudio && this.remoteStream) {
            try {
                remoteAudio.srcObject = this.remoteStream;
                // Force play remote audio
                await remoteAudio.play();
                console.log('🔊 Remote audio setup complete');
                
                // Set up remote audio visualization
                this.setupRemoteAudioVisualization();
            } catch (error) {
                console.error('Remote audio setup error:', error);
                // Try alternative approach
                this.forcePlayRemoteAudio();
            }
        }
    }

    async forcePlayRemoteAudio() {
        const remoteAudio = document.getElementById('remoteAudio');
        if (remoteAudio) {
            // Create user interaction to enable audio
            const playPromise = remoteAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('✅ Remote audio playing');
                }).catch(error => {
                    console.log('🔄 Auto-play prevented, will play on user interaction');
                    // Add click listener to start audio
                    document.addEventListener('click', () => {
                        remoteAudio.play();
                    }, { once: true });
                });
            }
        }
    }

    setupAudioVisualization() {
        try {
            // Set up local audio visualization
            this.localAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.localAnalyser = this.localAudioContext.createAnalyser();
            const localSource = this.localAudioContext.createMediaStreamSource(this.localStream);
            localSource.connect(this.localAnalyser);
            this.localAnalyser.fftSize = 256;
            
            // Start local audio visualization
            this.visualizeLocalAudio();
        } catch (error) {
            console.log('Local audio visualization setup failed:', error);
        }
    }

    setupRemoteAudioVisualization() {
        try {
            // Set up remote audio visualization
            this.remoteAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.remoteAnalyser = this.remoteAudioContext.createAnalyser();
            const remoteSource = this.remoteAudioContext.createMediaStreamSource(this.remoteStream);
            remoteSource.connect(this.remoteAnalyser);
            this.remoteAnalyser.fftSize = 256;
            
            // Start remote audio visualization
            this.visualizeRemoteAudio();
        } catch (error) {
            console.log('Remote audio visualization setup failed:', error);
        }
    }

    visualizeLocalAudio() {
        if (!this.localAnalyser) return;
        
        const bufferLength = this.localAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateLevel = () => {
            if (!this.localAnalyser) return;
            
            this.localAnalyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;
            const level = Math.min(100, (average / 255) * 100 * 3); // Amplify for visibility
            
            const localLevel = document.getElementById('localLevel');
            if (localLevel) {
                localLevel.style.width = level + '%';
            }
            
            requestAnimationFrame(updateLevel);
        };
        
        updateLevel();
    }

    visualizeRemoteAudio() {
        if (!this.remoteAnalyser) return;
        
        const bufferLength = this.remoteAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateLevel = () => {
            if (!this.remoteAnalyser) return;
            
            this.remoteAnalyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;
            const level = Math.min(100, (average / 255) * 100 * 3); // Amplify for visibility
            
            const remoteLevel = document.getElementById('remoteLevel');
            if (remoteLevel) {
                remoteLevel.style.width = level + '%';
            }
            
            requestAnimationFrame(updateLevel);
        };
        
        updateLevel();
    }

    onConnectionEstablished() {
        document.getElementById('callStatus').textContent = 'CONNECTED';
        document.getElementById('peerName').textContent = 'CONNECTED';
        showStatus('📞 Voice Call Connected', 'success');
        
        // Test audio with a beep
        this.playTestTone();
    }

    onConnectionLost() {
        document.getElementById('callStatus').textContent = 'DISCONNECTED';
        showStatus('📞 Voice Call Disconnected', 'error');
    }

    playTestTone() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800; // Higher frequency for testing
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            setTimeout(() => oscillator.stop(), 200);
            
            console.log('🔔 Test tone played');
        } catch (error) {
            console.log('Test tone failed:', error);
        }
    }

    async createOffer() {
        this.isInitiator = true;
        console.log('📞 Creating call offer...');
        
        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            socket.emit('call-offer', {
                offer: offer,
                to: currentPeerId,
                from: socket.id
            });
            
            console.log('✅ Call offer sent');
        } catch (error) {
            console.error('❌ Error creating offer:', error);
        }
    }

    async createAnswer(offer) {
        this.isInitiator = false;
        console.log('📞 Creating call answer...');
        
        try {
            await this.peerConnection.setRemoteDescription(offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            socket.emit('call-answer', {
                answer: answer,
                to: currentPeerId,
                from: socket.id
            });
            
            console.log('✅ Call answer sent');
        } catch (error) {
            console.error('❌ Error creating answer:', error);
        }
    }

    async handleAnswer(answer) {
        console.log('📞 Handling call answer...');
        
        try {
            await this.peerConnection.setRemoteDescription(answer);
            console.log('✅ Remote description set');
        } catch (error) {
            console.error('❌ Error handling answer:', error);
        }
    }

    async handleIceCandidate(candidate) {
        try {
            await this.peerConnection.addIceCandidate(candidate);
            console.log('✅ ICE candidate added');
        } catch (error) {
            console.error('❌ Error handling ICE candidate:', error);
        }
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                const isEnabled = audioTrack.enabled;
                audioTrack.enabled = !isEnabled;
                
                console.log(isEnabled ? '🔇 Microphone muted' : '🎤 Microphone unmuted');
                
                // Update UI
                const muteBtn = document.getElementById('muteBtn');
                const icon = muteBtn.querySelector('i');
                
                if (audioTrack.enabled) {
                    icon.classList.remove('fa-microphone-slash');
                    icon.classList.add('fa-microphone');
                    muteBtn.style.borderColor = 'var(--warning)';
                } else {
                    icon.classList.remove('fa-microphone');
                    icon.classList.add('fa-microphone-slash');
                    muteBtn.style.borderColor = 'var(--danger)';
                }
                
                return audioTrack.enabled;
            }
        }
        return false;
    }

    toggleSpeaker() {
        const remoteAudio = document.getElementById('remoteAudio');
        const speakerBtn = document.getElementById('speakerBtn');
        const icon = speakerBtn.querySelector('i');
        
        if (remoteAudio) {
            remoteAudio.muted = !remoteAudio.muted;
            
            if (remoteAudio.muted) {
                icon.classList.remove('fa-volume-up');
                icon.classList.add('fa-volume-mute');
                speakerBtn.style.borderColor = 'var(--danger)';
                showStatus('🔇 Speaker Muted', 'success');
            } else {
                icon.classList.remove('fa-volume-mute');
                icon.classList.add('fa-volume-up');
                speakerBtn.style.borderColor = 'var(--primary)';
                showStatus('🔊 Speaker Unmuted', 'success');
            }
        }
    }

    endCall() {
        console.log('📞 Ending voice call...');
        
        // Stop local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                console.log('🛑 Stopping track:', track.kind);
                track.stop();
            });
        }
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            console.log('🔗 Peer connection closed');
        }
        
        // Clean up audio contexts
        if (this.localAudioContext) {
            this.localAudioContext.close();
        }
        if (this.remoteAudioContext) {
            this.remoteAudioContext.close();
        }
        
        // Reset variables
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.localAudioContext = null;
        this.remoteAudioContext = null;
        this.localAnalyser = null;
        this.remoteAnalyser = null;
        
        // Reset UI
        const localLevel = document.getElementById('localLevel');
        const remoteLevel = document.getElementById('remoteLevel');
        if (localLevel) localLevel.style.width = '0%';
        if (remoteLevel) remoteLevel.style.width = '0%';
    }

    showErrorMessage(message) {
        showStatus(message, 'error');
        alert(message); // Also show as alert for mobile
    }
}
