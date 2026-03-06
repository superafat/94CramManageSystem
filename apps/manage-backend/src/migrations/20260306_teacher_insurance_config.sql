ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS insurance_config JSONB
  DEFAULT '{"labor":{"enabled":false,"tierLevel":1,"calculationMode":"auto","manualPersonalAmount":null,"manualEmployerAmount":null},"health":{"enabled":false,"tierLevel":1,"calculationMode":"auto","manualPersonalAmount":null,"manualEmployerAmount":null},"supplementalHealth":{"employmentType":"part_time","insuredThroughUnit":false,"averageWeeklyHours":null,"notes":null}}'::jsonb;

UPDATE teachers
SET insurance_config = COALESCE(
  insurance_config,
  CASE
    WHEN salary_type = 'monthly' THEN '{"labor":{"enabled":true,"tierLevel":1,"calculationMode":"auto","manualPersonalAmount":null,"manualEmployerAmount":null},"health":{"enabled":true,"tierLevel":1,"calculationMode":"auto","manualPersonalAmount":null,"manualEmployerAmount":null},"supplementalHealth":{"employmentType":"full_time","insuredThroughUnit":true,"averageWeeklyHours":null,"notes":null}}'::jsonb
    ELSE '{"labor":{"enabled":false,"tierLevel":1,"calculationMode":"auto","manualPersonalAmount":null,"manualEmployerAmount":null},"health":{"enabled":false,"tierLevel":1,"calculationMode":"auto","manualPersonalAmount":null,"manualEmployerAmount":null},"supplementalHealth":{"employmentType":"part_time","insuredThroughUnit":false,"averageWeeklyHours":null,"notes":null}}'::jsonb
  END
);