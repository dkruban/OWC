let socket;
let currentPeerId;
let webrtcManager;

function initializeSocket() {
    socket = io();
    webrtcManager = new WebRTCManager();
    
    // Socket events
    socket.on('connect', () => {
        document.getElementById('peerId').textContent = socket.id;
        document.getElementById('connectionStatus').textContent = 'ONLINE';
        showStatus('CONNECTED TO SIGNALING SERVER', 'success');
    });
    
    socket.on('disconnect', () => {
        document.getElementById('connectionStatus').textContent = 'OFFLINE';
        showStatus('DISCONNECTED FROM SERVER', 'error');
    });
    
    socket.on('incoming-call', async (data) => {
        currentPeerId = data.from;
        document.getElementById('incomingNumber').textContent = data.from;
        document.getElementById('incomingCall').classList.add('active');
        
        // Initialize WebRTC
        await webrtcManager.initialize();
    });
    
    socket.on('call-offer', async (data) => {
        await webrtcManager.createAnswer(data.offer);
    });
    
    socket.on('call-answer', async (data) => {
        await webrtcManager.handleAnswer(data.answer);
    });
    
    socket.on('ice-candidate', async (data) => {
        await webrtcManager.handleIceCandidate(data.candidate);
    });
    
    socket.on('call-ended', () => {
        endCall();
        showStatus('PEER ENDED CALL', 'success');
    });
    
    socket.on('peer-unavailable', () => {
        showStatus('PEER NOT AVAILABLE', 'error');
        closeNumberModal();
    });
}

function initiateConnection() {
    const targetPeerId = document.getElementById('numberInput').value.trim();
    
    if (!targetPeerId) {
        showStatus('PLEASE ENTER PEER ID', 'error');
        return;
    }
    
    if (targetPeerId === socket.id) {
        showStatus('CANNOT CALL YOURSELF', 'error');
        return;
    }
    
    currentPeerId = targetPeerId;
    
    // Check if peer is online
    socket.emit('check-peer', { peerId: targetPeerId }, async (response) => {
        if (response.online) {
            closeNumberModal();
            
            // Initialize WebRTC and start call
            const initialized = await webrtcManager.initialize();
            if (initialized) {
                document.getElementById('callNumber').textContent = targetPeerId;
                document.getElementById('callInterface').classList.add('active');
                document.getElementById('callStatus').textContent = 'CONNECTING...';
                
                await webrtcManager.createOffer();
                startCallTimer();
            }
        } else {
            showStatus('PEER NOT FOUND', 'error');
        }
    });
}
