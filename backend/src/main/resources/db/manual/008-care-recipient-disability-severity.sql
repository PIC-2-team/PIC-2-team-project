ALTER TABLE care_recipient
    ADD COLUMN disability_severity VARCHAR(20) NULL,
    ADD COLUMN guardian_contact_phone VARCHAR(20) NULL,
    ADD COLUMN emergency_contact_phone VARCHAR(20) NULL,
    ADD COLUMN doctor_hospital VARCHAR(100) NULL,
    ADD COLUMN medication_info VARCHAR(1000) NULL,
    ADD COLUMN allergy_notes VARCHAR(1000) NULL;

UPDATE care_recipient
SET disability_severity = CASE
    WHEN disability_grade BETWEEN 1 AND 3 THEN 'SEVERE'
    WHEN disability_grade IS NOT NULL THEN 'LESS_SEVERE'
    ELSE NULL
END;
