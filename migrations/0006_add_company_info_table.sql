-- Migration: Add company_info table for chatbot functionality
-- Created: 2024-12-19

CREATE TABLE IF NOT EXISTS company_info (
    id SERIAL PRIMARY KEY,
    section_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample company data for NASTP
INSERT INTO company_info (section_name, content) VALUES
('mission', 'Foster research, innovation & development in aviation, space, IT and cyber technologies, products and services to accrue maximum social, economic, security and scientific dividends for the country.'),
('vision', 'Become one of the best Aerospace, Cyber & IT Clusters in the world and transform the national landscape with design, R&D and innovation centers for emerging and disruptive technologies.'),
('benefits', 'Health insurance for employees and families. Flexible hours & work-from-home allowance. Performance-based bonuses & stock options. Paid parental leave and wellness programs.'),
('work_environment', 'Hybrid and remote work options available. Slack is used for communication; Jira for task tracking. $1,000 annual learning budget per employee for certifications/courses.'),
('application_process', '1. Submit your application via our Careers portal. 2. Complete a short assessment test (online, 30 minutes). 3. Technical interview with team lead (online or onsite). 4. Final HR interview discussing company culture, benefits, and expectations.'),
('about', 'NASTP (National Aerospace Science & Technology Park) is a premier research and development organization focused on aerospace, cyber, and IT technologies. We are committed to fostering innovation and developing cutting-edge solutions for national security and technological advancement.'),
('faqs', 'Q: What is the typical interview process? A: Our process includes an online assessment, technical interview, and final HR interview. Q: Do you offer remote work? A: Yes, we offer hybrid and remote work options. Q: What benefits do you provide? A: We offer comprehensive health insurance, flexible hours, performance bonuses, and learning budgets.'); 