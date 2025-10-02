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
            console.log('Requesting microphone access...');
            
            // Get user media with explicit constraints
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                },
                video: false 
            });
            
            console.log('Microphone access granted, tracks:', this.localStream.getTracks().length);
            
            // Set local audio element
            const localAudio = document.getElementById('localAudio');
            if (localAudio) {
                localAudio.srcObject = this.localStream;
                console.log('Local audio element set');
            }
            
            // Create peer connection
            this.createPeerConnection();
            
            // Add local stream to peer connection
            this.localStream.getTracks().forEach(track => {
                console.log('Adding track:', track.kind, track.label);
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            return true;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            showStatus('MICROPHONE ACCESS DENIED: ' + error.message, 'error');
            return false;
        }
    }

    createPeerConnection() {
        console.log('Creating peer connection...');
        this.peerConnection = new RTCPeerConnection(this.configuration);
        
        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('Received remote track:', event.track.kind);
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
                const remoteAudio = document.getElementById('remoteAudio');
                if (remoteAudio) {
                    remoteAudio.srcObject = this.remoteStream;
                    console.log('Remote audio element set');
                    // Ensure audio plays
                    remoteAudio.play().catch(e => console.log('Remote audio play failed:', e));
                }
                this.startAudioVisualization();
            }
        };
        
        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate');
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    to: currentPeerId
                });
            }
        };
        
        // Handle connection state change
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'connected') {
                document.getElementById('callStatus').textContent = 'CONNECTED';
                showStatus('PEER CONNECTION ESTABLISHED', 'success');
                // Test audio by playing a tone
                this.testAudio();
            } else if (this.peerConnection.connectionState === 'disconnected') {
                this.endCall();
            }
        };
        
        // Handle ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        };
    }

    testAudio() {
        // Create a test tone to verify audio works
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 440; // A4 note
        gainNode.gain.value = 0.1; // Low volume
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), 500); // Play for 500ms
        
        console.log('Test tone played');
    }

    async createOffer() {
        this.isInitiator = true;
        console.log('Creating offer...');
        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            socket.emit('call-offer', {
                offer: offer,
                to: currentPeerId,
                from: socket.id
            });
            console.log('Offer sent');
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    }

    async createAnswer(offer) {
        this.isInitiator = false;
        console.log('Creating answer...');
        try {
            await this.peerConnection.setRemoteDescription(offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            socket.emit('call-answer', {
                answer: answer,
                to: currentPeerId,
                from: socket.id
            });
            console.log('Answer sent');
        } catch (error) {
            console.error('Error creating answer:', error);
        }
    }

    async handleAnswer(answer) {
        console.log('Handling answer...');
        try {
            await this.peerConnection.setRemoteDescription(answer);
            console.log('Remote description set');
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    async handleIceCandidate(candidate) {
        console.log('Handling ICE candidate...');
        try {
            await this.peerConnection.addIceCandidate(candidate);
            console.log('ICE candidate added');
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                this.isAudioEnabled = !this.isAudioEnabled;
                audioTrack.enabled = this.isAudioEnabled;
                console.log('Microphone', this.isAudioEnabled ? 'enabled' : 'disabled');
                return this.isAudioEnabled;
            }
        }
        return false;
    }

    endCall() {
        console.log('Ending call...');
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        this.localStream = null;
        this.remoteStream = null;
        this.stopAudioVisualization();
    }

    startAudioVisualization() {
        console.log('Starting audio visualization...');
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(this.remoteStream);
        source.connect(analyser);
        
        analyser.fftSize = 256;
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
}
