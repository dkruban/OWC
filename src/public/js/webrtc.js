class WebRTCManager {
    constructor() {
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        };
        this.isInitiator = false;
        this.isAudioEnabled = true;
    }

    async initialize() {
        try {
            console.log('🎤 Requesting microphone access...');
            
            // Get user media with audio-specific constraints
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100,
                    channelCount: 1,
                    latency: 0.01
                },
                video: false 
            });
            
            console.log('✅ Microphone access granted');
            console.log('🎵 Audio tracks:', this.localStream.getAudioTracks().length);
            
            // Set local audio element for monitoring
            const localAudio = document.getElementById('localAudio');
            if (localAudio) {
                localAudio.srcObject = this.localStream;
                localAudio.volume = 0; // Mute local audio to prevent echo
                console.log('🔊 Local audio element configured');
            }
            
            // Create peer connection
            this.createPeerConnection();
            
            // Add local audio stream to peer connection
            this.localStream.getAudioTracks().forEach(track => {
                console.log('📡 Adding audio track:', track.label, 'enabled:', track.enabled);
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            // Test local audio
            this.testLocalAudio();
            
            return true;
        } catch (error) {
            console.error('❌ Microphone access error:', error);
            showStatus('MICROPHONE ACCESS DENIED: ' + error.message, 'error');
            return false;
        }
    }

    createPeerConnection() {
        console.log('🔗 Creating WebRTC peer connection...');
        this.peerConnection = new RTCPeerConnection(this.configuration);
        
        // Handle remote audio stream
        this.peerConnection.ontrack = (event) => {
            console.log('📥 Received remote track:', event.track.kind);
            
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
                const remoteAudio = document.getElementById('remoteAudio');
                
                if (remoteAudio) {
                    remoteAudio.srcObject = this.remoteStream;
                    remoteAudio.volume = 1.0; // Full volume for remote audio
                    
                    // Force play the audio
                    remoteAudio.play().then(() => {
                        console.log('🔊 Remote audio playing successfully');
                    }).catch(e => {
                        console.error('❌ Remote audio play failed:', e);
                        // Try to play with user interaction
                        document.addEventListener('click', () => {
                            remoteAudio.play();
                        }, { once: true });
                    });
                    
                    console.log('🎵 Remote audio configured');
                }
                
                // Start audio visualization
                this.startAudioVisualization();
                
                // Test remote audio
                setTimeout(() => this.testRemoteAudio(), 1000);
            }
        };
        
        // Handle ICE candidates for connection
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Sending ICE candidate');
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    to: currentPeerId
                });
            }
        };
        
        // Monitor connection state
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log('🔌 Connection state:', state);
            
            if (state === 'connected') {
                document.getElementById('callStatus').textContent = 'CONNECTED';
                showStatus('🎵 AUDIO CONNECTION ESTABLISHED', 'success');
                this.testAudioPath();
            } else if (state === 'disconnected' || state === 'failed') {
                showStatus('🔇 AUDIO CONNECTION LOST', 'error');
            }
        };
        
        // Monitor ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection.iceConnectionState;
            console.log('❄️ ICE connection state:', state);
            
            if (state === 'connected' || state === 'completed') {
                console.log('✅ ICE connection established');
            } else if (state === 'failed') {
                console.error('❌ ICE connection failed');
                showStatus('CONNECTION FAILED - TRY AGAIN', 'error');
            }
        };
    }

    testLocalAudio() {
        console.log('🔊 Testing local audio...');
        
        // Create audio context to test microphone input
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(this.localStream);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        source.connect(analyser);
        
        const checkAudio = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            
            if (average > 10) {
                console.log('🎤 Local microphone is working (level:', average.toFixed(2), ')');
                return true;
            }
            return false;
        };
        
        // Check audio levels for 3 seconds
        let checks = 0;
        const interval = setInterval(() => {
            if (checkAudio() || checks++ > 30) {
                clearInterval(interval);
            }
        }, 100);
    }

    testRemoteAudio() {
        console.log('🔊 Testing remote audio...');
        
        if (!this.remoteStream) {
            console.log('❌ No remote stream to test');
            return;
        }
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(this.remoteStream);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        source.connect(analyser);
        
        const checkAudio = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            
            if (average > 10) {
                console.log('🎵 Remote audio is working (level:', average.toFixed(2), ')');
                showStatus('🎵 RECEIVING AUDIO FROM PEER', 'success');
                return true;
            }
            return false;
        };
        
        // Check audio levels for 5 seconds
        let checks = 0;
        const interval = setInterval(() => {
            if (checkAudio() || checks++ > 50) {
                clearInterval(interval);
                if (checks > 50) {
                    console.log('⚠️ No remote audio detected - peer may be muted');
                    showStatus('⚠️ NO AUDIO FROM PEER', 'error');
                }
            }
        }, 100);
    }

    testAudioPath() {
        console.log('🔄 Testing complete audio path...');
        
        // Play a test tone to verify audio path
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 440; // A4 note
        gainNode.gain.value = 0.05; // Very low volume
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), 300); // Play for 300ms
        
        console.log('🔔 Test tone played - check if you hear it');
        
        // Also send test tone through WebRTC
        this.sendTestTone();
    }

    sendTestTone() {
        if (!this.localStream) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const dest = audioContext.createMediaStreamDestination();
        
        oscillator.connect(gainNode);
        gainNode.connect(dest);
        
        oscillator.frequency.value = 880; // A5 note
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), 300);
        
        // Add test tone to local stream
        const testTrack = dest.stream.getAudioTracks()[0];
        if (testTrack) {
            this.peerConnection.addTrack(testTrack, this.localStream);
            console.log('📡 Test tone sent through WebRTC');
        }
    }

    async createOffer() {
        this.isInitiator = true;
        console.log('📤 Creating WebRTC offer...');
        
        try {
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            
            await this.peerConnection.setLocalDescription(offer);
            
            socket.emit('call-offer', {
                offer: offer,
                to: currentPeerId,
                from: socket.id
            });
            
            console.log('✅ Offer sent successfully');
        } catch (error) {
            console.error('❌ Error creating offer:', error);
            showStatus('FAILED TO CREATE CONNECTION', 'error');
        }
    }

    async createAnswer(offer) {
        this.isInitiator = false;
        console.log('📥 Creating WebRTC answer...');
        
        try {
            await this.peerConnection.setRemoteDescription(offer);
            
            const answer = await this.peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            
            await this.peerConnection.setLocalDescription(answer);
            
            socket.emit('call-answer', {
                answer: answer,
                to: currentPeerId,
                from: socket.id
            });
            
            console.log('✅ Answer sent successfully');
        } catch (error) {
            console.error('❌ Error creating answer:', error);
            showStatus('FAILED TO ACCEPT CALL', 'error');
        }
    }

    async handleAnswer(answer) {
        console.log('📥 Handling WebRTC answer...');
        
        try {
            await this.peerConnection.setRemoteDescription(answer);
            console.log('✅ Remote description set');
        } catch (error) {
            console.error('❌ Error handling answer:', error);
        }
    }

    async handleIceCandidate(candidate) {
        console.log('🧊 Handling ICE candidate...');
        
        try {
            await this.peerConnection.addIceCandidate(candidate);
            console.log('✅ ICE candidate added');
        } catch (error) {
            console.error('❌ Error handling ICE candidate:', error);
        }
    }

    toggleMute() {
        if (!this.localStream) {
            console.log('❌ No local stream to mute');
            return false;
        }
        
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (!audioTrack) {
            console.log('❌ No audio track to mute');
            return false;
        }
        
        this.isAudioEnabled = !this.isAudioEnabled;
        audioTrack.enabled = this.isAudioEnabled;
        
        console.log(this.isAudioEnabled ? '🎤 Microphone UNMUTED' : '🔇 Microphone MUTED');
        showStatus(this.isAudioEnabled ? '🎤 MICROPHONE ACTIVE' : '🔇 MICROPHONE MUTED', 'success');
        
        return this.isAudioEnabled;
    }

    endCall() {
        console.log('📞 Ending audio call...');
        
        // Stop all tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                console.log('🛑 Stopping track:', track.kind);
                track.stop();
            });
        }
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        this.localStream = null;
        this.remoteStream = null;
        this.stopAudioVisualization();
        
        console.log('✅ Call ended');
    }

    startAudioVisualization() {
        console.log('📊 Starting audio visualization...');
        
        if (!this.remoteStream) {
            console.log('❌ No remote stream for visualization');
            return;
        }
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(this.remoteStream);
        
        source.connect(analyser);
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateVisualization = () => {
            if (!this.remoteStream) return;
            
            analyser.getByteFrequencyData(dataArray);
            const bars = document.querySelectorAll('.wave-bar');
            
            bars.forEach((bar, index) => {
                const value = dataArray[index * Math.floor(bufferLength / bars.length)];
                const height = Math.max(20, (value / 255) * 100);
                bar.style.height = height + 'px';
            });
            
            requestAnimationFrame(updateVisualization);
        };
        
        updateVisualization();
    }

    stopAudioVisualization() {
        const bars = document.querySelectorAll('.wave-bar');
        bars.forEach(bar => {
            bar.style.height = '20px';
        });
    }

    // Get current audio levels
    getAudioLevels() {
        if (!this.localStream) return { local: 0, remote: 0 };
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const localAnalyser = audioContext.createAnalyser();
        const remoteAnalyser = audioContext.createAnalyser();
        
        const localSource = audioContext.createMediaStreamSource(this.localStream);
        const remoteSource = this.remoteStream ? 
            audioContext.createMediaStreamSource(this.remoteStream) : null;
        
        localSource.connect(localAnalyser);
        if (remoteSource) remoteSource.connect(remoteAnalyser);
        
        const localData = new Uint8Array(localAnalyser.frequencyBinCount);
        const remoteData = new Uint8Array(remoteAnalyser ? remoteAnalyser.frequencyBinCount : 1);
        
        localAnalyser.getByteFrequencyData(localData);
        if (remoteAnalyser) remoteAnalyser.getByteFrequencyData(remoteData);
        
        const localLevel = localData.reduce((a, b) => a + b) / localData.length;
        const remoteLevel = remoteData.reduce((a, b) => a + b) / remoteData.length;
        
        return {
            local: localLevel / 255,
            remote: remoteLevel / 255
        };
    }
}
