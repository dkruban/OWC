let socket;
let currentPeerId;
let webrtcManager;

function initializeSocket() {
    console.log('Initializing socket connection...');
    
    // Try to connect to Socket.io
    try {
        socket = io({
            transports: ['websocket', 'polling'], // Try both transports
            timeout: 20000,
            forceNew: true
        });
        
        webrtcManager = new WebRTCManager();
        
        // Connection event
        socket.on('connect', () => {
            console.log('Socket connected with ID:', socket.id);
            document.getElementById('peerId').textContent = socket.id;
            document.getElementById('connectionStatus').textContent = 'ONLINE';
            updateConnectionIndicator('ONLINE');
            showStatus('CONNECTED TO SIGNALING SERVER', 'success');
        });
        
        // Disconnection event
        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            document.getElementById('connectionStatus').textContent = 'OFFLINE';
            updateConnectionIndicator('OFFLINE');
            showStatus('DISCONNECTED FROM SERVER: ' + reason, 'error');
        });
        
        // Connection error
        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            showStatus('CONNECTION ERROR: ' + error.message, 'error');
        });
        
        // Reconnection attempt
        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log('Reconnection attempt:', attemptNumber);
            showStatus('RECONNECTING... (' + attemptNumber + ')', 'error');
        });
        
        // Reconnected
        socket.on('reconnect', (attemptNumber) => {
            console.log('Reconnected after', attemptNumber, 'attempts');
            showStatus('RECONNECTED SUCCESSFULLY', 'success');
        });
        
        // Incoming call
        socket.on('incoming-call', async (data) => {
            console.log('Incoming call from:', data.from);
            currentPeerId = data.from;
            document.getElementById('incomingNumber').textContent = data.from;
            document.getElementById('incomingCall').classList.add('active');
            
            // Initialize WebRTC
            await webrtcManager.initialize();
        });
        
        // Call offer
        socket.on('call-offer', async (data) => {
            console.log('Received call offer');
            await webrtcManager.createAnswer(data.offer);
        });
        
        // Call answer
        socket.on('call-answer', async (data) => {
            console.log('Received call answer');
            await webrtcManager.handleAnswer(data.answer);
        });
        
        // ICE candidate
        socket.on('ice-candidate', async (data) => {
            console.log('Received ICE candidate');
            await webrtcManager.handleIceCandidate(data.candidate);
        });
        
        // Call ended
        socket.on('call-ended', () => {
            console.log('Call ended by peer');
            endCall();
            showStatus('PEER ENDED CALL', 'success');
        });
        
        // Call declined
        socket.on('call-declined', () => {
            console.log('Call declined by peer');
            showStatus('CALL DECLINED', 'error');
        });
        
        // Peer unavailable
        socket.on('peer-unavailable', () => {
            console.log('Peer unavailable');
            showStatus('PEER NOT AVAILABLE', 'error');
            closeNumberModal();
        });
        
    } catch (error) {
        console.error('Error initializing socket:', error);
        showStatus('SOCKET INITIALIZATION ERROR', 'error');
    }
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
        console.log('Peer check response:', response);
        
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
            console.log('Peer not found:', targetPeerId);
        }
    });
}
