-- 1. Additive changes to whatsapp_templates
ALTER TABLE whatsapp_templates
ADD COLUMN interakt_template_id VARCHAR(255) NULL,
ADD COLUMN display_name VARCHAR(150) NULL,
ADD COLUMN header_type ENUM('NONE','TEXT','IMAGE','VIDEO','DOCUMENT') NOT NULL DEFAULT 'NONE',
ADD COLUMN header_media_url TEXT NULL,
ADD COLUMN body_variable_count INT NOT NULL DEFAULT 0,
ADD COLUMN header_variable_count INT NOT NULL DEFAULT 0,
ADD COLUMN updated_by INT NULL;

-- 2. Create whatsapp_template_assignments table
CREATE TABLE IF NOT EXISTS whatsapp_template_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_key VARCHAR(100) NOT NULL UNIQUE,
    template_id INT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    updated_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES whatsapp_templates(id) ON DELETE CASCADE
);

-- 3. Additive snapshot changes to whatsapp_message_queue
ALTER TABLE whatsapp_message_queue
ADD COLUMN template_header_type ENUM('NONE','TEXT','IMAGE','VIDEO','DOCUMENT') NOT NULL DEFAULT 'NONE' AFTER template_language,
ADD COLUMN template_header_values JSON NULL AFTER template_header_type;

-- 4. Seed the completely hardcoded thanksform template so we can assign it
INSERT IGNORE INTO whatsapp_templates (
    template_key, template_name, language_code, trigger_type, display_name, header_type, body_variable_count, is_active
) VALUES (
    'DIRECT_LEAD_CREATED_THANK_YOU', 'thanksform', 'en', 'DIRECT_LEAD_CREATED', 'Default Thanks Form (Legacy)', 'NONE', 1, 1
);

-- Note: We use a subquery to find the newly inserted or existing thanksform id
INSERT IGNORE INTO whatsapp_template_assignments (assignment_key, template_id, is_active)
SELECT 'DIRECT_LEAD_WELCOME', id, 1 FROM whatsapp_templates WHERE template_name = 'thanksform' LIMIT 1;

INSERT IGNORE INTO whatsapp_template_assignments (assignment_key, template_id, is_active)
SELECT 'BOT_LEAD_WELCOME', id, 1 FROM whatsapp_templates WHERE template_name = 'thanksform' LIMIT 1;
