class WebRTCManager {
    constructor() {
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
    }

    // Initialize microphone and audio
    async initialize() {
        try {
            console.log('🎤 Requesting microphone access...');
            
            // Get microphone access
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                },
                video: false 
            });
            
            console.log('✅ Microphone access granted');
            
            // Set local audio (so you can hear yourself)
            const localAudio = document.getElementById('localAudio');
            if (localAudio) {
                localAudio.srcObject = this.localStream;
                console.log('🔊 Local audio connected');
            }
            
            // Create WebRTC connection
            this.createPeerConnection();
            
            // Add your audio to the connection
            this.localStream.getTracks().forEach(track => {
                console.log('📡 Adding audio track to connection');
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            return true;
        } catch (error) {
            console.error('❌ Microphone error:', error);
            alert('Microphone access required for voice calls');
            return false;
        }
    }

    // Create WebRTC peer connection
    createPeerConnection() {
        console.log('🔗 Creating peer connection...');
        this.peerConnection = new RTCPeerConnection(this.configuration);
        
        // When you receive audio from other person
        this.peerConnection.ontrack = (event) => {
            console.log('🎧 Received remote audio track');
            
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
                
                // Play remote audio
                const remoteAudio = document.getElementById('remoteAudio');
                if (remoteAudio) {
                    remoteAudio.srcObject = this.remoteStream;
                    remoteAudio.play().catch(e => console.log('Audio play error:', e));
                    console.log('🔊 Remote audio playing');
                }
            }
        };
        
        // Handle ICE candidates for connection
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    to: currentPeerId
                });
            }
        };
        
        // Connection status
        this.peerConnection.onconnectionstatechange = () => {
            console.log('📶 Connection state:', this.peerConnection.connectionState);
            
            if (this.peerConnection.connectionState === 'connected') {
                console.log('✅ Voice connection established!');
                document.getElementById('callStatus').textContent = 'CONNECTED';
            }
        };
    }

    // Start call (caller)
    async createOffer() {
        console.log('📞 Creating call offer...');
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        
        socket.emit('call-offer', {
            offer: offer,
            to: currentPeerId,
            from: socket.id
        });
    }

    // Answer call (receiver)
    async createAnswer(offer) {
        console.log('📞 Creating call answer...');
        await this.peerConnection.setRemoteDescription(offer);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        
        socket.emit('call-answer', {
            answer: answer,
            to: currentPeerId,
            from: socket.id
        });
    }

    // Handle call answer
    async handleAnswer(answer) {
        console.log('📞 Handling call answer...');
        await this.peerConnection.setRemoteDescription(answer);
    }

    // Handle ICE candidates
    async handleIceCandidate(candidate) {
        await this.peerConnection.addIceCandidate(candidate);
    }

    // Mute/unmute microphone
    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                const isMuted = !audioTrack.enabled;
                console.log(isMuted ? '🔇 Microphone muted' : '🎤 Microphone unmuted');
                return !isMuted;
            }
        }
        return false;
    }

    // End call
    endCall() {
        console.log('📞 Ending call...');
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        
        this.localStream = null;
        this.remoteStream = null;
    }
}
