-- 1. Extend whatsapp_templates
ALTER TABLE whatsapp_templates
ADD COLUMN body_variable_mapping JSON NULL,
ADD COLUMN header_variable_mapping JSON NULL;

-- 2. Extend whatsapp_message_queue
ALTER TABLE whatsapp_message_queue
ADD COLUMN template_body_variable_mapping JSON NULL AFTER template_params;
