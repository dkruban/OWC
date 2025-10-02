// Add this function to handle audio permissions
async function requestAudioPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        console.log('Audio permission granted');
        return true;
    } catch (error) {
        console.error('Audio permission denied:', error);
        showStatus('MICROPHONE PERMISSION REQUIRED', 'error');
        return false;
    }
}

// Update the toggleMute function
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

// Add this to your initialize function
document.addEventListener('DOMContentLoaded', async () => {
    // Request audio permission early
    await requestAudioPermission();
    showStatus('SYSTEM READY', 'success');
});
