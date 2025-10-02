const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Store active peers
const activePeers = new Map();

// Socket connection handling
io.on('connection', (socket) => {
    console.log('Peer connected:', socket.id);
    activePeers.set(socket.id, socket);
    
    // Handle peer check
    socket.on('check-peer', (data, callback) => {
        const peer = activePeers.get(data.peerId);
        callback({ online: !!peer });
    });
    
    // Handle call offer
    socket.on('call-offer', (data) => {
        const targetPeer = activePeers.get(data.to);
        if (targetPeer) {
            targetPeer.emit('incoming-call', {
                from: data.from,
                offer: data.offer
            });
        }
    });
    
    // Handle call answer
    socket.on('call-answer', (data) => {
        const targetPeer = activePeers.get(data.to);
        if (targetPeer) {
            targetPeer.emit('call-answer', {
                from: data.from,
                answer: data.answer
            });
        }
    });
    
    // Handle ICE candidates
    socket.on('ice-candidate', (data) => {
        const targetPeer = activePeers.get(data.to);
        if (targetPeer) {
            targetPeer.emit('ice-candidate', {
                from: socket.id,
                candidate: data.candidate
            });
        }
    });
    
    // Handle call end
    socket.on('end-call', (data) => {
        const targetPeer = activePeers.get(data.to);
        if (targetPeer) {
            targetPeer.emit('call-ended');
        }
    });
    
    // Handle call decline
    socket.on('decline-call', (data) => {
        const targetPeer = activePeers.get(data.to);
        if (targetPeer) {
            targetPeer.emit('call-declined');
        }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Peer disconnected:', socket.id);
        activePeers.delete(socket.id);
    });
});

// API Routes
app.use('/api', require('./routes/api'));

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
server.listen(PORT, () => {
    console.log(`Secure Comms Server running on port ${PORT}`);
    console.log(`WebSocket server ready for peer connections`);
});
