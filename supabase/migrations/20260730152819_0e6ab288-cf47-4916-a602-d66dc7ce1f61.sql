
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  department text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_no integer NOT NULL UNIQUE,
  name text NOT NULL,
  topic text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL,
  period integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject text NOT NULL,
  teacher text NOT NULL,
  department text NOT NULL,
  semester text NOT NULL,
  section text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.timetable TO service_role;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_no integer NOT NULL,
  student_name text NOT NULL,
  topic text,
  cycle integer NOT NULL DEFAULT 1,
  kind text NOT NULL DEFAULT 'original',
  subject text,
  teacher text,
  period integer,
  presented_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  review text,
  rating integer,
  needs_repeat boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.presentations TO service_role;
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.repeat_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_no integer NOT NULL,
  reason text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.repeat_queue TO service_role;
ALTER TABLE public.repeat_queue ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_settings (key, value) VALUES ('current_cycle', '1'), ('forced_roll', '');
