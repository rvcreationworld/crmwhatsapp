CREATE TABLE IF NOT EXISTS whatsapp_recurring_broadcasts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    broadcast_name VARCHAR(255) NOT NULL,
    schedule_type ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'DAILY',
    daily_time TIME NOT NULL,
    week_day VARCHAR(20) DEFAULT NULL,
    month_day INT DEFAULT NULL,
    message_type VARCHAR(50) NOT NULL,
    text_message TEXT,
    media_library_id INT DEFAULT NULL,
    media_url VARCHAR(1024) DEFAULT NULL,
    button_payload_json JSON,
    list_payload_json JSON,
    is_enabled TINYINT(1) DEFAULT 1,
    execution_status ENUM('IDLE', 'PROCESSING') DEFAULT 'IDLE',
    processing_started_at DATETIME DEFAULT NULL,
    last_execution_datetime DATETIME DEFAULT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enabled (is_enabled),
    INDEX idx_schedule (schedule_type, daily_time)
);

CREATE TABLE IF NOT EXISTS whatsapp_recurring_broadcast_recipients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    broadcast_id INT NOT NULL,
    execution_key VARCHAR(100) NOT NULL,
    conversation_id INT NOT NULL,
    lead_id INT,
    lead_table VARCHAR(50),
    lead_type VARCHAR(20),
    telecaller_id INT,
    phone_number VARCHAR(20) NOT NULL,
    queue_id INT DEFAULT NULL,
    status ENUM('QUEUED', 'FAILED') DEFAULT 'QUEUED',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME DEFAULT NULL,
    UNIQUE KEY uk_execution (broadcast_id, execution_key, phone_number),
    INDEX idx_key (execution_key)
);

-- requested indexes on conversations and queue
ALTER TABLE whatsapp_conversations ADD INDEX idx_last_message (last_customer_message_at);
ALTER TABLE whatsapp_conversations ADD INDEX idx_phone (phone_number);
ALTER TABLE whatsapp_automation_queue ADD INDEX idx_status (status);
ALTER TABLE whatsapp_automation_queue ADD INDEX idx_scheduled (scheduled_at);
