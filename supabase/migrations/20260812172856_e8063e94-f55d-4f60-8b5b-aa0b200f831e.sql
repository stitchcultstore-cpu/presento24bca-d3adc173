INSERT INTO public.timetable (day_of_week, period, start_time, end_time, subject, teacher, department, semester, section)
SELECT d, 9, '00:00', '23:59', 'Test Session', 'Demo Teacher', 'BCA', '4', 'A'
FROM generate_series(0,6) AS d
WHERE NOT EXISTS (
  SELECT 1 FROM public.timetable t WHERE t.day_of_week = d AND t.period = 9
);