let socket;
let currentPeerId;
let webrtcManager;

function initializeSocket() {
    socket = io();
    webrtcManager = new WebRTCManager();
    
    // When connected to server
    socket.on('connect', () => {
        document.getElementById('peerId').textContent = socket.id;
        document.getElementById('connectionStatus').textContent = 'ONLINE';
        console.log('🌐 Connected to server');
    });
    
    // Incoming call
    socket.on('incoming-call', async (data) => {
        console.log('📞 Incoming call from:', data.from);
        currentPeerId = data.from;
        document.getElementById('incomingNumber').textContent = data.from;
        document.getElementById('incomingCall').classList.add('active');
        
        // Initialize audio when receiving call
        await webrtcManager.initialize();
    });
    
    // Call offer received
    socket.on('call-offer', async (data) => {
        console.log('📞 Call offer received');
        await webrtcManager.createAnswer(data.offer);
    });
    
    // Call answer received
    socket.on('call-answer', async (data) => {
        console.log('📞 Call answer received');
        await webrtcManager.handleAnswer(data.answer);
    });
    
    // ICE candidate received
    socket.on('ice-candidate', async (data) => {
        console.log('📡 ICE candidate received');
        await webrtcManager.handleIceCandidate(data.candidate);
    });
    
    // Call ended
    socket.on('call-ended', () => {
        console.log('📞 Call ended');
        endCall();
    });
}

// Start call to someone
function initiateConnection() {
    const targetPeerId = document.getElementById('numberInput').value.trim();
    
    if (!targetPeerId) {
        alert('Please enter Peer ID');
        return;
    }
    
    currentPeerId = targetPeerId;
    
    // Check if peer is online
    socket.emit('check-peer', { peerId: targetPeerId }, async (response) => {
        if (response.online) {
            closeNumberModal();
            
            // Initialize audio and start call
            const initialized = await webrtcManager.initialize();
            if (initialized) {
                document.getElementById('callNumber').textContent = targetPeerId;
                document.getElementById('callInterface').classList.add('active');
                
                await webrtcManager.createOffer();
                startCallTimer();
            }
        } else {
            alert('Peer not found');
        }
    });
}
