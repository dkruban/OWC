// Socket event handlers for secure communications

const handleConnection = (socket, io) => {
    console.log(`Peer connected: ${socket.id}`);
    
    // Store peer connection
    socket.peerData = {
        id: socket.id,
        connectedAt: new Date(),
        status: 'online'
    };
    
    // Notify all peers about new connection
    socket.broadcast.emit('peer-connected', {
        peerId: socket.id,
        timestamp: new Date().toISOString()
    });
    
    // Handle peer disconnection
    socket.on('disconnect', () => {
        console.log(`Peer disconnected: ${socket.id}`);
        
        // Notify all peers about disconnection
        socket.broadcast.emit('peer-disconnected', {
            peerId: socket.id,
            timestamp: new Date().toISOString()
        });
    });
    
    // Handle peer status updates
    socket.on('status-update', (data) => {
        socket.peerData.status = data.status;
        socket.broadcast.emit('peer-status', {
            peerId: socket.id,
            status: data.status,
            timestamp: new Date().toISOString()
        });
    });
    
    // Handle ping for connection health
    socket.on('ping', () => {
        socket.emit('pong', {
            timestamp: new Date().toISOString()
        });
    });
};

const handleCallEvents = (socket, io) => {
    // Handle call initiation
    socket.on('initiate-call', (data) => {
        const targetSocket = io.sockets.sockets.get(data.targetPeerId);
        
        if (targetSocket) {
            targetSocket.emit('incoming-call', {
                fromPeerId: socket.id,
                callType: data.callType || 'audio',
                timestamp: new Date().toISOString()
            });
            
            socket.emit('call-initiated', {
                targetPeerId: data.targetPeerId,
                status: 'ringing'
            });
        } else {
            socket.emit('call-error', {
                error: 'Peer not found',
                targetPeerId: data.targetPeerId
            });
        }
    });
    
    // Handle call response
    socket.on('call-response', (data) => {
        const targetSocket = io.sockets.sockets.get(data.targetPeerId);
        
        if (targetSocket) {
            targetSocket.emit('call-response', {
                fromPeerId: socket.id,
                response: data.response, // 'accept' or 'decline'
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Handle WebRTC signaling
    socket.on('webrtc-offer', (data) => {
        const targetSocket = io.sockets.sockets.get(data.targetPeerId);
        
        if (targetSocket) {
            targetSocket.emit('webrtc-offer', {
                fromPeerId: socket.id,
                offer: data.offer
            });
        }
    });
    
    socket.on('webrtc-answer', (data) => {
        const targetSocket = io.sockets.sockets.get(data.targetPeerId);
        
        if (targetSocket) {
            targetSocket.emit('webrtc-answer', {
                fromPeerId: socket.id,
                answer: data.answer
            });
        }
    });
    
    socket.on('webrtc-ice-candidate', (data) => {
        const targetSocket = io.sockets.sockets.get(data.targetPeerId);
        
        if (targetSocket) {
            targetSocket.emit('webrtc-ice-candidate', {
                fromPeerId: socket.id,
                candidate: data.candidate
            });
        }
    });
    
    // Handle call end
    socket.on('end-call', (data) => {
        const targetSocket = io.sockets.sockets.get(data.targetPeerId);
        
        if (targetSocket) {
            targetSocket.emit('call-ended', {
                fromPeerId: socket.id,
                reason: data.reason || 'user-ended',
                timestamp: new Date().toISOString()
            });
        }
    });
};

const handlePeerDiscovery = (socket, io) => {
    // Handle peer list request
    socket.on('get-peers', () => {
        const peers = [];
        
        io.sockets.sockets.forEach((peerSocket) => {
            if (peerSocket.id !== socket.id && peerSocket.peerData) {
                peers.push({
                    id: peerSocket.id,
                    status: peerSocket.peerData.status,
                    connectedAt: peerSocket.peerData.connectedAt
                });
            }
        });
        
        socket.emit('peers-list', {
            peers: peers,
            timestamp: new Date().toISOString()
        });
    });
    
    // Handle peer search
    socket.on('search-peer', (data) => {
        const targetSocket = io.sockets.sockets.get(data.peerId);
        
        socket.emit('peer-search-result', {
            peerId: data.peerId,
            found: !!targetSocket,
            status: targetSocket ? targetSocket.peerData.status : 'offline',
            timestamp: new Date().toISOString()
        });
    });
};

module.exports = {
    handleConnection,
    handleCallEvents,
    handlePeerDiscovery
};
