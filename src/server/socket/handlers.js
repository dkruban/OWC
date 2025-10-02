// Add this function to debug peer ID issues
function debugPeerConnection() {
    console.log('Current Peer ID:', socket.id);
    console.log('Socket connected:', socket.connected);
    console.log('Active peers:', Array.from(activePeers.keys()));
}

// Update the initiateConnection function
function initiateConnection() {
    const targetPeerId = document.getElementById('numberInput').value.trim();
    
    console.log('Attempting to connect to:', targetPeerId);
    debugPeerConnection();
    
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
