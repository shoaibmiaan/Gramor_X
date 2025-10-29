-- 20260401093000_notifications_unsubscribe.sql
-- Add unsubscribe links to seeded notification templates.

update public.notification_templates
set body = 'Hi {{first_name}},\n\nYour study reminder for {{module}} is ready. Jump back in: {{deep_link}}.\n\nKeep going — you''re doing great!\n\nManage preferences: {{manage_notifications_url}}\nUnsubscribe: {{unsubscribe_url}}'
where template_key = 'study_reminder' and channel = 'email' and locale = 'en';

update public.notification_templates
set body = 'Great news {{first_name}}!\n\nYour {{module}} score is ready. View it here: {{deep_link}}.\n\nNeed help interpreting the result? We''ve got tips waiting for you.\n\nManage preferences: {{manage_notifications_url}}\nUnsubscribe: {{unsubscribe_url}}'
where template_key = 'score_ready' and channel = 'email' and locale = 'en';
