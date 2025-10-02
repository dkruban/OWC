class WebRTCManager {
    constructor() {
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { 
                    urls: 'turn:relay.metered.ca:80',
                    username: 'd8b0c6e5e2b5f3d0e8b1c5a9f2e6d4b0',
                    credential: 'JzR8KzN7QmX2VpY5WtL6RsF3GhH8JkN9'
                }
            ]
        };
        this.isInitiator = false;
    }

    async initialize() {
        try {
            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true,
                video: false 
            });
            
            document.getElementById('localAudio').srcObject = this.localStream;
            
            // Create peer connection
            this.createPeerConnection();
            
            return true;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            showStatus('MICROPHONE ACCESS DENIED', 'error');
            return false;
        }
    }

    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.configuration);
        
        // Add local stream
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });
        
        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            document.getElementById('remoteAudio').srcObject = this.remoteStream;
            this.startAudioVisualization();
        };
        
        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
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
            } else if (this.peerConnection.connectionState === 'disconnected') {
                this.endCall();
            }
        };
    }

    async createOffer() {
        this.isInitiator = true;
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        
        socket.emit('call-offer', {
            offer: offer,
            to: currentPeerId,
            from: socket.id
        });
    }

    async createAnswer(offer) {
        this.isInitiator = false;
        await this.peerConnection.setRemoteDescription(offer);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        
        socket.emit('call-answer', {
            answer: answer,
            to: currentPeerId,
            from: socket.id
        });
    }

    async handleAnswer(answer) {
        await this.peerConnection.setRemoteDescription(answer);
    }

    async handleIceCandidate(candidate) {
        await this.peerConnection.addIceCandidate(candidate);
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled;
            return audioTrack.enabled;
        }
        return false;
    }

    endCall() {
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
                const height = (value / 255) * 100 + 20;
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
