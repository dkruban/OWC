// Request microphone permission at startup
async function requestAudioPermission() {
    try {
        console.log('🎤 Requesting microphone permission...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true,
            video: false 
        });
        
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
        
        console.log('✅ Microphone permission granted');
        showStatus('🎤 MICROPHONE READY', 'success');
        return true;
    } catch (error) {
        console.error('❌ Microphone permission denied:', error);
        showStatus('🎤 MICROPHONE PERMISSION REQUIRED', 'error');
        
        // Show user how to enable microphone
        if (error.name === 'NotAllowedError') {
            showStatus('📌 Click the 🔒 icon in address bar to allow microphone', 'error');
        }
        return false;
    }
}

// Enhanced toggle mute function
function toggleMute() {
    if (!webrtcManager) {
        showStatus('❌ NO ACTIVE CALL', 'error');
        return;
    }
    
    const isEnabled = webrtcManager.toggleMute();
    const muteBtn = document.querySelector('.call-btn.mute');
    const icon = muteBtn.querySelector('i');
    
    if (isEnabled) {
        icon.classList.remove('fa-microphone-slash');
        icon.classList.add('fa-microphone');
        muteBtn.style.borderColor = 'var(--warning)';
    } else {
        icon.classList.remove('fa-microphone');
        icon.classList.add('fa-microphone-slash');
        muteBtn.style.borderColor = 'var(--danger)';
    }
}

// Toggle speaker/output
function toggleSpeaker() {
    const remoteAudio = document.getElementById('remoteAudio');
    const speakerBtn = document.querySelector('.call-btn.speaker');
    const icon = speakerBtn.querySelector('i');
    
    if (!remoteAudio) {
        showStatus('❌ NO AUDIO OUTPUT', 'error');
        return;
    }
    
    remoteAudio.muted = !remoteAudio.muted;
    
    if (remoteAudio.muted) {
        icon.classList.remove('fa-volume-up');
        icon.classList.add('fa-volume-mute');
        speakerBtn.style.borderColor = 'var(--danger)';
        showStatus('🔇 SPEAKER MUTED', 'success');
    } else {
        icon.classList.remove('fa-volume-mute');
        icon.classList.add('fa-volume-up');
        speakerBtn.style.borderColor = 'var(--primary)';
        showStatus('🔊 SPEAKER ACTIVE', 'success');
    }
}

// Monitor audio levels
function startAudioMonitoring() {
    setInterval(() => {
        if (webrtcManager && webrtcManager.localStream) {
            const levels = webrtcManager.getAudioLevels();
            
            // Update UI based on audio levels
            if (levels.local > 0.1) {
                // User is speaking
                document.body.style.setProperty('--speaking-indicator', 'var(--primary)');
            } else {
                document.body.style.setProperty('--speaking-indicator', 'transparent');
            }
        }
    }, 100);
}

// Initialize audio on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎵 Initializing audio system...');
    
    // Request microphone permission early
    const hasPermission = await requestAudioPermission();
    
    if (hasPermission) {
        // Start audio monitoring
        startAudioMonitoring();
        showStatus('🎵 AUDIO SYSTEM READY', 'success');
    } else {
        showStatus('⚠️ AUDIO NOT AVAILABLE', 'error');
    }
});

// Add CSS for speaking indicator
const style = document.createElement('style');
style.textContent = `
    .speaking-indicator {
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        padding: 5px 15px;
        background: var(--speaking-indicator, transparent);
        color: white;
        border-radius: 20px;
        font-size: 12px;
        transition: all 0.3s ease;
        z-index: 1000;
    }
`;
document.head.appendChild(style);
