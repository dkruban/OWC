// Mute/unmute microphone
function toggleMute() {
    if (webrtcManager) {
        const isEnabled = webrtcManager.toggleMute();
        const muteBtn = document.querySelector('.call-btn.mute');
        const icon = muteBtn.querySelector('i');
        
        if (isEnabled) {
            icon.classList.remove('fa-microphone-slash');
            icon.classList.add('fa-microphone');
            showStatus('🎤 Microphone ON', 'success');
        } else {
            icon.classList.remove('fa-microphone');
            icon.classList.add('fa-microphone-slash');
            showStatus('🔇 Microphone OFF', 'success');
        }
    }
}

// Accept incoming call
function acceptIncomingCall() {
    document.getElementById('incomingCall').classList.remove('active');
    document.getElementById('callNumber').textContent = currentPeerId;
    document.getElementById('callInterface').classList.add('active');
    startCallTimer();
    showStatus('📞 Call Connected', 'success');
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
    showStatus('📞 Call Ended', 'success');
}
