CREATE TABLE IF NOT EXISTS whatsapp_media_library (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    media_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255) NOT NULL,
    media_type ENUM('IMAGE', 'VIDEO') NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    public_url VARCHAR(1024) NOT NULL,
    relative_path VARCHAR(1024) NOT NULL,
    uploaded_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (stored_file_name)
);
