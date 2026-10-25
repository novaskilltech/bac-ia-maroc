-- ==============================================================================
-- SCHEMA & POLITIQUES DE SECURITE (RLS) - BAC IA MAROC (CONFORME CDC v1.1)
-- ==============================================================================

-- 1. Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    firstname TEXT,
    whatsapp TEXT,
    grade_level TEXT DEFAULT '2bac',
    track TEXT DEFAULT 'PC_BIOF',
    lang TEXT DEFAULT 'fr',
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'valide', 'refuse', 'suspendu')),
    payment_status TEXT DEFAULT 'non_paye' CHECK (payment_status IN ('non_paye', 'preuve_envoyee', 'paiement_valide', 'rembourse')),
    quiz_completed BOOLEAN DEFAULT FALSE,
    assigned_profile TEXT,
    main_learning_profile TEXT,
    secondary_learning_profile TEXT,
    profile_scores JSONB,
    quiz_scores JSONB,
    daily_time_minutes INTEGER DEFAULT 60,
    bac_session TEXT DEFAULT 'national',
    stress_level INTEGER DEFAULT 5,
    confidence_level INTEGER DEFAULT 5,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_diagnostic_at TIMESTAMP WITH TIME ZONE,
    validated_at TIMESTAMP WITH TIME ZONE
);

-- Index pour optimiser les filtres admin et recherches
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp ON public.profiles(whatsapp);

-- 2. Activer la securite Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Nettoyer les anciennes policies si existantes
DROP POLICY IF EXISTS "Les utilisateurs peuvent creer leur profil" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur profil" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur profil" ON public.profiles;
DROP POLICY IF EXISTS "Les admins peuvent voir tous les profils" ON public.profiles;
DROP POLICY IF EXISTS "Les admins peuvent modifier tous les profils" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

-- 3. Fonction helper securisee pour verifier si l'appelant est admin (sans recursion RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 4. POLICIES RLS

-- A. INSERT : L'utilisateur authentifie peut inserer son propre profil (statut force a 'en_attente', role force a 'user')
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
WITH CHECK (
    auth.uid() = id
    AND (role IS NULL OR role = 'user')
    AND (status IS NULL OR status = 'en_attente')
);

-- B. SELECT : L'utilisateur peut lire son profil OU l'admin peut tout lire
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
USING (
    auth.uid() = id 
    OR public.is_admin()
);

-- C. UPDATE : 
-- L'utilisateur ne peut modifier que ses propres donnees de quiz/profils (interdiction de s'auto-valider ou devenir admin)
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    -- Empeche l'utilisateur normal de changer son role ou son statut de validation
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND status = (SELECT status FROM public.profiles WHERE id = auth.uid())
);

-- D. ADMIN FULL ACCESS : L'admin peut mettre a jour tous les profils (valider, refuser, assigner role)
CREATE POLICY "profiles_admin_update"
ON public.profiles
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5. Trigger d'initialisation automatique a l'inscription Auth Supabase (Optionnel mais hautement recommande)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, firstname, whatsapp, grade_level, track, lang, status, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'firstname', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
    COALESCE(NEW.raw_user_meta_data->>'grade_level', '2bac'),
    COALESCE(NEW.raw_user_meta_data->>'track', 'PC_BIOF'),
    COALESCE(NEW.raw_user_meta_data->>'lang', 'fr'),
    'en_attente',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 6. TABLES PEDAGOGIQUES, HISTORIQUE DE CHAT, PLANNING & DOCUMENTS SAUVEGARDES
-- ==============================================================================

-- A. Historique des conversations IA
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chats_own" ON public.chats;
CREATE POLICY "chats_own" ON public.chats FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- (Note : Les fiches et documents de révision sont sauvegardés 100% en local sur l'appareil de l'élève)

-- B. Mémoire pédagogique : Erreurs de l'élève
CREATE TABLE IF NOT EXISTS public.student_error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT,
    chapter TEXT,
    skill TEXT,
    error_type TEXT,
    severity INTEGER DEFAULT 1,
    note TEXT,
    ai_feedback TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.student_error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_error_logs_own" ON public.student_error_logs;
CREATE POLICY "student_error_logs_own" ON public.student_error_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- D. Mémoire pédagogique : Maîtrise des notions
CREATE TABLE IF NOT EXISTS public.student_mastery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT,
    chapter TEXT,
    skill TEXT NOT NULL,
    mastery_score NUMERIC DEFAULT 0.5,
    last_practiced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    next_review_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '3 days'),
    UNIQUE(user_id, skill)
);
ALTER TABLE public.student_mastery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_mastery_own" ON public.student_mastery;
CREATE POLICY "student_mastery_own" ON public.student_mastery FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- E. Plans de révision 30 jours
CREATE TABLE IF NOT EXISTS public.student_revision_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    plan_type TEXT DEFAULT 'national',
    target_exam_date DATE,
    daily_time_minutes INTEGER DEFAULT 60,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.student_revision_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_revision_plans_own" ON public.student_revision_plans;
CREATE POLICY "student_revision_plans_own" ON public.student_revision_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- F. Tâches quotidiennes de révision
CREATE TABLE IF NOT EXISTS public.student_revision_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID REFERENCES public.student_revision_plans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_date DATE NOT NULL,
    subject TEXT,
    chapter TEXT,
    skill TEXT,
    task_type TEXT,
    title TEXT NOT NULL,
    description TEXT,
    estimated_minutes INTEGER DEFAULT 30,
    priority INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.student_revision_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_revision_tasks_own" ON public.student_revision_tasks;
CREATE POLICY "student_revision_tasks_own" ON public.student_revision_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- G. Calendrier officiel des examens
CREATE TABLE IF NOT EXISTS public.app_exam_calendar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_name TEXT UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    active BOOLEAN DEFAULT TRUE
);
ALTER TABLE public.app_exam_calendar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_exam_calendar_read" ON public.app_exam_calendar;
CREATE POLICY "app_exam_calendar_read" ON public.app_exam_calendar FOR SELECT USING (true);

INSERT INTO public.app_exam_calendar (session_name, start_date, active)
VALUES 
  ('national', '2027-06-08', true),
  ('rattrapage', '2027-07-06', true)
ON CONFLICT (session_name) DO NOTHING;

