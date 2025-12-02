-- A/B Testing System Database Schema
-- Creates tables for managing A/B tests and tracking participants

-- Table for A/B test configurations
CREATE TABLE IF NOT EXISTS ab_tests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  test_name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  variant_a_name VARCHAR(255) NOT NULL,
  variant_b_name VARCHAR(255) NOT NULL,
  traffic_split INT DEFAULT 50,
  status ENUM('active', 'completed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_test_name (test_name)
);

-- Table for tracking user assignments and conversions
CREATE TABLE IF NOT EXISTS ab_test_participants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  test_id INT NOT NULL,
  user_id INT NOT NULL,
  variant_assigned ENUM('A', 'B') NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP NULL,
  FOREIGN KEY (test_id) REFERENCES ab_tests(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_test (test_id, user_id),
  INDEX idx_test_variant (test_id, variant_assigned),
  INDEX idx_converted (test_id, converted)
);
