ALTER TABLE telecaller_master 
ADD COLUMN interakt_agent_email VARCHAR(255) NULL,
ADD COLUMN interakt_agent_status ENUM('NOT_REGISTERED', 'PENDING', 'ACTIVE') DEFAULT 'NOT_REGISTERED',
ADD COLUMN interakt_last_verified_at DATETIME NULL;
