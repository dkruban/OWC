// Matrix Rain Effect
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

// Call variables
let callTimer;
let callSeconds = 0;
let isMuted = false;

// Modal functions
function openNumberModal() {
    document.getElementById('numberModal').classList.add('active');
    document.getElementById('numberInput').value = '';
    document.getElementById('numberInput').focus();
}

function closeNumberModal() {
    document.getElementById('numberModal').classList.remove('active');
}

// Start call timer
function startCallTimer() {
    callSeconds = 0;
    updateCallTimer();
    callTimer = setInterval(() => {
        callSeconds++;
        updateCallTimer();
    }, 1000);
}

// Update call timer display
function updateCallTimer() {
    const minutes = Math.floor(callSeconds / 60);
    const seconds = callSeconds % 60;
    document.getElementById('callTimer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// End call
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
    showStatus('CONNECTION TERMINATED', 'success');
}

// Toggle mute
function toggleMute() {
    if (webrtcManager) {
        const isEnabled = webrtcManager.toggleMute();
        const muteBtn = document.querySelector('.call-btn.mute');
        const icon = muteBtn.querySelector('i');
        
        if (isEnabled) {
            icon.classList.remove('fa-microphone-slash');
            icon.classList.add('fa-microphone');
            showStatus('MICROPHONE ACTIVE', 'success');
        } else {
            icon.classList.remove('fa-microphone');
            icon.classList.add('fa-microphone-slash');
            showStatus('MICROPHONE MUTED', 'success');
        }
    }
}

// Toggle speaker
function toggleSpeaker() {
    const remoteAudio = document.getElementById('remoteAudio');
    const speakerBtn = document.querySelector('.call-btn.speaker');
    const icon = speakerBtn.querySelector('i');
    
    remoteAudio.muted = !remoteAudio.muted;
    
    if (remoteAudio.muted) {
        icon.classList.remove('fa-volume-up');
        icon.classList.add('fa-volume-mute');
        showStatus('SPEAKER MUTED', 'success');
    } else {
        icon.classList.remove('fa-volume-mute');
        icon.classList.add('fa-volume-up');
        showStatus('SPEAKER ACTIVE', 'success');
    }
}

// Accept incoming call
function acceptIncomingCall() {
    document.getElementById('incomingCall').classList.remove('active');
    document.getElementById('callNumber').textContent = currentPeerId;
    document.getElementById('callStatus').textContent = 'CONNECTED';
    document.getElementById('callInterface').classList.add('active');
    startCallTimer();
    showStatus('INCOMING CALL ACCEPTED', 'success');
}

// Decline incoming call
function declineIncomingCall() {
    document.getElementById('incomingCall').classList.remove('active');
    if (socket && currentPeerId) {
        socket.emit('decline-call', { to: currentPeerId });
    }
    if (webrtcManager) {
        webrtcManager.endCall();
    }
    showStatus('INCOMING CALL DECLINED', 'success');
}

// Show status message
function showStatus(message, type = 'success') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = 'status-message show ' + type;
    
    setTimeout(() => {
        statusEl.classList.remove('show');
    }, 3000);
}

// Copy peer ID function
function copyPeerId() {
    const peerId = document.getElementById('peerId').textContent;
    if (peerId && peerId !== 'GENERATING...') {
        navigator.clipboard.writeText(peerId);
        showStatus('PEER ID COPIED', 'success');
    }
}

// Update connection indicator
function updateConnectionIndicator(status) {
    const indicatorDot = document.getElementById('indicatorDot');
    const indicatorText = document.getElementById('indicatorText');
    
    indicatorDot.className = 'indicator-dot';
    
    switch(status) {
        case 'ONLINE':
            indicatorDot.classList.add('online');
            indicatorText.textContent = 'CONNECTED';
            break;
        case 'OFFLINE':
            indicatorDot.classList.add('offline');
            indicatorText.textContent = 'DISCONNECTED';
            break;
        default:
            indicatorText.textContent = 'CONNECTING...';
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (document.getElementById('numberModal').classList.contains('active')) {
            closeNumberModal();
        } else if (document.getElementById('callInterface').classList.contains('active')) {
            endCall();
        }
    }
    
    if (document.getElementById('numberModal').classList.contains('active') && e.key === 'Enter') {
        initiateConnection();
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing socket...');
    initializeSocket();
    showStatus('SYSTEM READY', 'success');
});
