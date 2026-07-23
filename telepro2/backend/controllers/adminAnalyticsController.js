const analyticsService = require('../services/analyticsService');

exports.getOverview = async (req, res) => {
    try {
        const { preset = 'today', startDate, endDate, telecaller_id } = req.query;
        const data = await analyticsService.getOverview(preset, startDate, endDate, telecaller_id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Analytics Overview Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch analytics overview' });
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const { preset = 'today', startDate, endDate } = req.query;
        const data = await analyticsService.getLeaderboard(preset, startDate, endDate);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Analytics Leaderboard Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
    }
};

exports.getActionCenter = async (req, res) => {
    try {
        const data = await analyticsService.getActionCenter();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Analytics Action Center Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch action center' });
    }
};

exports.getHourlyPattern = async (req, res) => {
    try {
        const { preset = 'today', startDate, endDate, telecaller_id } = req.query;
        const data = await analyticsService.getHourlyPattern(preset, startDate, endDate, telecaller_id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Analytics Hourly Pattern Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch hourly pattern' });
    }
};
