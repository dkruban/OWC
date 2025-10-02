
const express = require('express');
const router = express.Router();

// API endpoint to get server status
router.get('/status', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API endpoint to get active peers count
router.get('/peers/count', (req, res) => {
    // This would typically get from your peer management system
    res.json({
        count: 0, // Placeholder
        message: 'Peer count available through socket events'
    });
});

// API endpoint for health check
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

module.exports = router;
