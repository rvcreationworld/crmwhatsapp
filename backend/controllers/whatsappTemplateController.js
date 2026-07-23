const whatsappTemplateService = require('../services/whatsappTemplateService');

exports.getTemplates = async (req, res) => {
    try {
        const templates = await whatsappTemplateService.getTemplates();
        res.status(200).json({ success: true, templates });
    } catch (error) {
        console.error('[TemplateController] Error fetching templates:', error);
        res.status(500).json({ success: false, message: 'Server error fetching templates' });
    }
};

exports.createTemplate = async (req, res) => {
    try {
        const adminId = req.user.id;
        const insertId = await whatsappTemplateService.createTemplate(req.body, adminId);
        res.status(201).json({ success: true, message: 'Template created successfully', id: insertId });
    } catch (error) {
        console.error('[TemplateController] Error creating template:', error);
        res.status(500).json({ success: false, message: 'Server error creating template' });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;
        await whatsappTemplateService.updateTemplate(id, req.body, adminId);
        res.status(200).json({ success: true, message: 'Template updated successfully' });
    } catch (error) {
        console.error('[TemplateController] Error updating template:', error);
        res.status(500).json({ success: false, message: 'Server error updating template' });
    }
};

exports.assignTemplate = async (req, res) => {
    try {
        const { assignmentKey } = req.params;
        const { templateId } = req.body;
        const adminId = req.user.id;

        if (!templateId) {
            return res.status(400).json({ success: false, message: 'templateId is required' });
        }

        await whatsappTemplateService.assignTemplate(assignmentKey, templateId, adminId);
        res.status(200).json({ success: true, message: `Template successfully assigned to ${assignmentKey}` });
    } catch (error) {
        console.error('[TemplateController] Error assigning template:', error);
        res.status(400).json({ success: false, message: error.message || 'Server error assigning template' });
    }
};
