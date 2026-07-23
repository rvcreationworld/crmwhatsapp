const mediaService = require('../services/whatsappMediaService');

const uploadMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const uploadedBy = req.user ? req.user.id : null;
        const result = await mediaService.insertMedia(req.file, uploadedBy);
        res.status(201).json({ success: true, message: 'Media uploaded successfully', media: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMedia = async (req, res) => {
    try {
        const mediaList = await mediaService.getAllMedia();
        res.status(200).json({ success: true, media: mediaList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteMedia = async (req, res) => {
    try {
        const { id } = req.params;
        await mediaService.deleteMedia(id);
        res.status(200).json({ success: true, message: 'Media deleted successfully' });
    } catch (error) {
        // Return 400 if it is a rejection from the template check
        if (error.message.includes('currently assigned')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    uploadMedia,
    getMedia,
    deleteMedia
};
