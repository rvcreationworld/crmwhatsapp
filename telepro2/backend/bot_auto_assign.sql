CREATE TABLE IF NOT EXISTS bot_auto_assign_state (
    id INT PRIMARY KEY,
    is_enabled TINYINT(1) NOT NULL DEFAULT 0,
    last_telecaller_id INT NULL,
    updated_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO bot_auto_assign_state (id, is_enabled) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS bot_top10_telecaller_cache (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    telecaller_id INT NOT NULL,
    rank_position INT NOT NULL,
    total_call_time_seconds BIGINT NOT NULL DEFAULT 0,
    connected_calls INT NOT NULL DEFAULT 0,
    is_blocked TINYINT(1) NOT NULL DEFAULT 0,
    calculated_at DATETIME NOT NULL,
    UNIQUE KEY uniq_top10_telecaller (telecaller_id)
);

CREATE TABLE IF NOT EXISTS bot_lead_assignment_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    original_new_lead_id INT NOT NULL,
    working_sheet_id INT NOT NULL,
    telecaller_id INT NOT NULL,
    assignment_mode ENUM('MANUAL_FETCH','AUTO_TOP10') NOT NULL,
    manual_queue_id BIGINT NULL,
    top10_rank_at_assignment INT NULL,
    total_call_time_snapshot BIGINT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_blah_telecaller (telecaller_id),
    INDEX idx_blah_working_sheet (working_sheet_id),
    INDEX idx_blah_mode (assignment_mode),
    INDEX idx_blah_assigned_at (assigned_at)
);
