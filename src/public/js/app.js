// Global variables
let callTimer;
let callSeconds = 0;

// Matrix rain effect
const canvas = document.getElementById('matrix-rain');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}";
const matrixArray = matrix.split("");
const fontSize = 10;
const columns = canvas.width / fontSize;
const drops = [];

for(let x = 0; x < columns; x++) {
    drops[x] = 1;
}

function drawMatrix() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#0F0';
    ctx.font = fontSize + 'px monospace';
    
    for(let i = 0; i < drops.length; i++) {
        const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        
        if(drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

setInterval(drawMatrix, 35);

// Window resize handler
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Modal functions
function openNumberModal() {
    document.getElementById('numberModal').classList.add('active');
    document.getElementById('numberInput').value = '';
    document.getElementById('numberInput').focus();
}

function closeNumberModal() {
    document.getElementById('numberModal').classList.remove('active');
}

// Call timer functions
function startCallTimer() {
    callSeconds = 0;
    updateCallTimer();
    callTimer = setInterval(() => {
        callSeconds++;
        updateCallTimer();
    }, 1000);
}

function updateCallTimer() {
    const minutes = Math.floor(callSeconds / 60);
    const seconds = callSeconds % 60;
    document.getElementById('callTimer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Call control functions
function toggleMute() {
    if (webrtcManager) {
        webrtcManager.toggleMute();
    }
}

function toggleSpeaker() {
    if (webrtcManager) {
        webrtcManager.toggleSpeaker();
    }
}

function endCall() {
    clearInterval(callTimer);
    
    if (webrtcManager) {
        webrtcManager.endCall();
    }
    
    if (socket && currentPeerId) {
        socket.emit('end-call', { to: currentPeerId });
    }
    
    document.getElementById('callInterface').classList.remove('active');
    document.getElementById('incomingCall').classList.remove('active');
    showStatus('📞 Call Ended', 'success');
}

// Incoming call functions
function acceptIncomingCall() {
    document.getElementById('incomingCall').classList.remove('active');
    document.getElementById('callNumber').textContent = currentPeerId;
    document.getElementById('callInterface').classList.add('active');
    document.getElementById('callStatus').textContent = 'CONNECTING...';
    startCallTimer();
    showStatus('📞 Call Accepted', 'success');
}

function declineIncomingCall() {
    document.getElementById('incomingCall').classList.remove('active');
    
    if (socket && currentPeerId) {
        socket.emit('decline-call', { to: currentPeerId });
    }
    
    if (webrtcManager) {
        webrtcManager.endCall();
    }
    
    showStatus('📞 Call Declined', 'success');
}

// Utility functions
function copyPeerId() {
    const peerId = document.getElementById('peerId').textContent;
    if (peerId && peerId !== 'GENERATING...') {
        navigator.clipboard.writeText(peerId).then(() => {
            showStatus('📋 Peer ID Copied', 'success');
        }).catch(() => {
            showStatus('❌ Copy Failed', 'error');
        });
    }
}

function showStatus(message, type = 'success') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = 'status-message show ' + type;
    
    setTimeout(() => {
        statusEl.classList.remove('show');
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (document.getElementById('numberModal').classList.contains('active')) {
            closeNumberModal();
        } else if (document.getElementById('callInterface').classList.contains('active')) {
            endCall();
        } else if (document.getElementById('incomingCall').classList.contains('active')) {
            declineIncomingCall();
        }
    }
    
    if (e.key === 'Enter' && document.getElementById('numberModal').classList.contains('active')) {
        initiateConnection();
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Secure Comms...');
    initializeSocket();
    showStatus('🚀 System Ready', 'success');
    
    // Request audio permissions early
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                stream.getTracks().forEach(track => track.stop());
                console.log('🎤 Audio permission pre-granted');
            })
            .catch(err => {
                console.log('🎤 Audio permission not pre-granted:', err);
            });
    }
});

// Handle page visibility for mobile
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('📱 App hidden - pausing operations');
    } else {
        console.log('📱 App visible - resuming operations');
        // Reinitialize audio if needed
        if (webrtcManager && webrtcManager.localStream) {
            webrtcManager.setupLocalAudio();
        }
    }
});
