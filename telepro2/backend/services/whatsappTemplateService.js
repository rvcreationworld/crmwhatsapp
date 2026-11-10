const db = require('../config/db');

const getTemplates = async () => {
    const [templates] = await db.query(`
        SELECT t.*, a.assignment_key 
        FROM whatsapp_templates t
        LEFT JOIN whatsapp_template_assignments a ON a.template_id = t.id AND a.is_active = 1
        ORDER BY t.created_at DESC
    `);
    return templates;
};

const getTemplateById = async (id) => {
    const [templates] = await db.query(`SELECT * FROM whatsapp_templates WHERE id = ?`, [id]);
    return templates.length ? templates[0] : null;
};

const getAssignedTemplate = async (assignmentKey) => {
    try {
        const [assignments] = await db.query(`
            SELECT t.* 
            FROM whatsapp_template_assignments a
            JOIN whatsapp_templates t ON a.template_id = t.id
            WHERE a.assignment_key = ? 
              AND a.is_active = 1 
              AND t.is_active = 1
            LIMIT 1
        `, [assignmentKey]);

        if (assignments.length > 0) {
            return {
                id: assignments[0].id,
                template_name: assignments[0].template_name,
                language_code: assignments[0].language_code || 'en',
                header_type: assignments[0].header_type || 'NONE',
                header_media_url: assignments[0].header_media_url,
                body_variable_count: assignments[0].body_variable_count || 0,
                header_variable_count: assignments[0].header_variable_count || 0,
                body_variable_mapping: assignments[0].body_variable_mapping
            };
        }
    } catch (err) {
        console.error(`[TemplateService] DB Error fetching assigned template for ${assignmentKey}:`, err.message);
    }

    // Strict Fallback
    console.warn(`[TemplateService] Fallback engaged for ${assignmentKey} -> using hardcoded thanksform`);
    return {
        id: null,
        template_name: 'thanksform',
        language_code: 'en',
        header_type: 'NONE',
        header_media_url: null,
        body_variable_count: 1,
        header_variable_count: 0,
        body_variable_mapping: ["customer_name"]
    };
};

const createTemplate = async (data, adminId) => {
    const {
        display_name, template_name, interakt_template_id, language_code, 
        description, header_type, header_media_url, body_variable_count, 
        header_variable_count, is_active, body_variable_mapping
    } = data;

    // Validate body_variable_mapping
    let safeMapping = null;
    if (body_variable_mapping) {
        if (!Array.isArray(body_variable_mapping)) throw new Error("body_variable_mapping must be an array");
        if (body_variable_mapping.length !== body_variable_count) throw new Error("body_variable_mapping length must equal body_variable_count");
        safeMapping = JSON.stringify(body_variable_mapping);
    }

    const [result] = await db.query(`
        INSERT INTO whatsapp_templates (
            template_key, display_name, template_name, interakt_template_id, language_code, 
            description, header_type, header_media_url, body_variable_count, 
            header_variable_count, is_active, trigger_type, body_variable_mapping, updated_by
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL_IMPORT', ?, ?
        )
    `, [
        `TMPL_${Date.now()}`, display_name, template_name, interakt_template_id || null, 
        language_code || 'en', description || null, header_type || 'NONE', 
        header_media_url || null, body_variable_count || 0, header_variable_count || 0, 
        is_active !== undefined ? is_active : 1, safeMapping, adminId
    ]);

    return result.insertId;
};

const updateTemplate = async (id, data, adminId) => {
    const {
        display_name, template_name, interakt_template_id, language_code, 
        description, header_type, header_media_url, body_variable_count, 
        header_variable_count, is_active, body_variable_mapping
    } = data;

    // Validate body_variable_mapping
    let safeMapping = null;
    if (body_variable_mapping) {
        if (!Array.isArray(body_variable_mapping)) throw new Error("body_variable_mapping must be an array");
        if (body_variable_mapping.length !== body_variable_count) throw new Error("body_variable_mapping length must equal body_variable_count");
        safeMapping = JSON.stringify(body_variable_mapping);
    }

    await db.query(`
        UPDATE whatsapp_templates SET 
            display_name = ?, template_name = ?, interakt_template_id = ?, language_code = ?, 
            description = ?, header_type = ?, header_media_url = ?, body_variable_count = ?, 
            header_variable_count = ?, is_active = ?, body_variable_mapping = ?, updated_by = ?
        WHERE id = ?
    `, [
        display_name, template_name, interakt_template_id || null, language_code || 'en', 
        description || null, header_type || 'NONE', header_media_url || null, 
        body_variable_count || 0, header_variable_count || 0, 
        is_active !== undefined ? is_active : 1, safeMapping, adminId, id
    ]);
};

const assignTemplate = async (assignmentKey, templateId, adminId) => {
    if (!['DIRECT_LEAD_WELCOME', 'BOT_LEAD_WELCOME'].includes(assignmentKey)) {
        throw new Error('Invalid assignment key');
    }

    const template = await getTemplateById(templateId);
    if (!template || !template.is_active) {
        throw new Error('Template does not exist or is not active');
    }

    // Inactivate existing
    await db.query(`UPDATE whatsapp_template_assignments SET is_active = 0, updated_by = ? WHERE assignment_key = ?`, [adminId, assignmentKey]);

    // Insert new assignment
    await db.query(`
        INSERT INTO whatsapp_template_assignments (assignment_key, template_id, is_active, updated_by)
        VALUES (?, ?, 1, ?)
        ON DUPLICATE KEY UPDATE template_id = VALUES(template_id), is_active = 1, updated_by = VALUES(updated_by)
    `, [assignmentKey, templateId, adminId]);
};

module.exports = {
    getTemplates,
    getTemplateById,
    getAssignedTemplate,
    createTemplate,
    updateTemplate,
    assignTemplate
};
