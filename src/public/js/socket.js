let socket;
let currentPeerId;
let webrtcManager;

function initializeSocket() {
    console.log('🌐 Initializing socket connection...');
    
    socket = io({
        transports: ['websocket', 'polling'],
        timeout: 20000
    });
    
    webrtcManager = new WebRTCManager();
    
    // Connection events
    socket.on('connect', () => {
        console.log('✅ Connected to server with ID:', socket.id);
        document.getElementById('peerId').textContent = socket.id;
        document.getElementById('connectionStatus').textContent = 'ONLINE';
        showStatus('🌐 Connected to Server', 'success');
    });
    
    socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from server:', reason);
        document.getElementById('connectionStatus').textContent = 'OFFLINE';
        showStatus('📡 Disconnected: ' + reason, 'error');
    });
    
    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        showStatus('📡 Connection Error', 'error');
    });
    
    // Voice call events
    socket.on('incoming-call', async (data) => {
        console.log('📞 Incoming call from:', data.from);
        currentPeerId = data.from;
        document.getElementById('incomingNumber').textContent = data.from;
        document.getElementById('incomingCall').classList.add('active');
        
        // Initialize audio when receiving call
        const initialized = await webrtcManager.initialize();
        if (!initialized) {
            declineIncomingCall();
        }
    });
    
    socket.on('call-offer', async (data) => {
        console.log('📞 Received call offer');
        await webrtcManager.createAnswer(data.offer);
    });
    
    socket.on('call-answer', async (data) => {
        console.log('📞 Received call answer');
        await webrtcManager.handleAnswer(data.answer);
    });
    
    socket.on('ice-candidate', async (data) => {
        console.log('📡 Received ICE candidate');
        await webrtcManager.handleIceCandidate(data.candidate);
    });
    
    socket.on('call-ended', () => {
        console.log('📞 Call ended by peer');
        endCall();
        showStatus('📞 Call Ended', 'success');
    });
    
    socket.on('call-declined', () => {
        console.log('📞 Call declined by peer');
        showStatus('📞 Call Declined', 'error');
        closeNumberModal();
    });
    
    socket.on('peer-unavailable', () => {
        console.log('❌ Peer not available');
        showStatus('❌ Peer Not Available', 'error');
        closeNumberModal();
    });
}

function initiateConnection() {
    const targetPeerId = document.getElementById('numberInput').value.trim();
    
    if (!targetPeerId) {
        showStatus('⚠️ Please enter Peer ID', 'error');
        return;
    }
    
    if (targetPeerId === socket.id) {
        showStatus('⚠️ Cannot call yourself', 'error');
        return;
    }
    
    currentPeerId = targetPeerId;
    
    // Check if peer is online
    socket.emit('check-peer', { peerId: targetPeerId }, async (response) => {
        console.log('Peer check response:', response);
        
        if (response.online) {
            closeNumberModal();
            
            // Initialize audio and start call
            const initialized = await webrtcManager.initialize();
            if (initialized) {
                document.getElementById('callNumber').textContent = targetPeerId;
                document.getElementById('callInterface').classList.add('active');
                document.getElementById('callStatus').textContent = 'CONNECTING...';
                
                await webrtcManager.createOffer();
                startCallTimer();
            }
        } else {
            showStatus('❌ Peer Not Found', 'error');
        }
    });
}
