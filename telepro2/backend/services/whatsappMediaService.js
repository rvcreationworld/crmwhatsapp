const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const getAppUrl = async () => {
    let url = process.env.APP_URL || process.env.COMPANY_WEBSITE || 'https://crm.shareshaala.com';
    try {
        const [settings] = await db.query(`SELECT setting_value FROM app_settings WHERE setting_key IN ('APP_URL', 'COMPANY_WEBSITE') AND setting_value IS NOT NULL AND setting_value != ''`);
        if (settings.length > 0) {
            url = settings[0].setting_value;
        }
    } catch (e) {
        console.warn("[MediaService] Could not fetch APP_URL from DB, using fallback", e.message);
    }
    // ensure no trailing slash
    return url.replace(/\/$/, '');
};

const insertMedia = async (file, uploadedBy) => {
    const isVideo = file.mimetype.startsWith('video/');
    const mediaType = isVideo ? 'VIDEO' : 'IMAGE';
    
    const relativePath = `/uploads/whatsapp/templates/${isVideo ? 'videos' : 'images'}/${file.filename}`;
    const appUrl = await getAppUrl();
    const publicUrl = `${appUrl}${relativePath}`;

    const [result] = await db.query(`
        INSERT INTO whatsapp_media_library (
            media_name, original_file_name, stored_file_name, media_type, mime_type, file_size, public_url, relative_path, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        file.originalname,
        file.originalname,
        file.filename,
        mediaType,
        file.mimetype,
        file.size,
        publicUrl,
        relativePath,
        uploadedBy || null
    ]);

    return { id: result.insertId, public_url: publicUrl, media_type: mediaType };
};

const getAllMedia = async () => {
    const [rows] = await db.query(`SELECT * FROM whatsapp_media_library ORDER BY created_at DESC`);
    return rows;
};

const deleteMedia = async (id) => {
    const [mediaRows] = await db.query(`SELECT * FROM whatsapp_media_library WHERE id = ?`, [id]);
    if (mediaRows.length === 0) {
        throw new Error("Media not found");
    }

    const media = mediaRows[0];

    // 1. Delete Safety: Check whatsapp_templates
    const [templates] = await db.query(`SELECT id, template_name FROM whatsapp_templates WHERE header_media_url = ?`, [media.public_url]);
    if (templates.length > 0) {
        throw new Error(`Media is currently assigned to one or more templates (e.g. ${templates[0].template_name}).`);
    }

    // 2. Delete database row
    await db.query(`DELETE FROM whatsapp_media_library WHERE id = ?`, [id]);

    // 3. Delete physical file
    const absolutePath = path.join(__dirname, '..', media.relative_path);
    if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
    }

    return true;
};

module.exports = {
    insertMedia,
    getAllMedia,
    deleteMedia
};
