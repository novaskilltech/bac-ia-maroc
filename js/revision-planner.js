const revisionPlanner = {
    calendar: [],
    
    async init() {
        await this.loadExamCalendar();
    },

    async loadExamCalendar() {
        try {
            const { data, error } = await supabaseClient
                .from('app_exam_calendar')
                .select('*')
                .eq('active', true);
            if (error) throw error;
            this.calendar = data || [];
        } catch (e) { console.error("Calendar Load Error", e); }
    },

    getTargetExamDate(user) {
        const session = (user && user.bac_session) ? user.bac_session : 'national';
        const target = this.calendar.find(c => c.session_name === (session === 'national_et_rattrapage' ? 'national' : session));
        let rawDate = target ? target.start_date : '2026-06-04';
        let parsed = new Date(rawDate);
        const now = new Date();

        // Si la date d'examen configurée est déjà passée, basculer automatiquement sur la session de juin prochain
        if (isNaN(parsed.getTime()) || parsed <= now) {
            const nextYear = (now.getMonth() >= 5) ? now.getFullYear() + 1 : now.getFullYear();
            const monthDay = session === 'rattrapage' ? '07-06' : '06-04';
            parsed = new Date(`${nextYear}-${monthDay}T08:00:00Z`);
        }
        return parsed.toISOString().split('T')[0];
    },

    async generateRevisionPlan(user) {
        const targetDate = new Date(this.getTargetExamDate(user));
        const today = new Date();
        const rawDiffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
        const diffDays = rawDiffDays > 0 ? rawDiffDays : 45;

        // Générer un programme intensif et structuré sur 30 jours glissants (évite de saturer Supabase avec >900 lignes)
        const planDays = Math.min(diffDays, 30);

        const dailyMinutes = user.daily_time_minutes || 60;
        const taskCount = dailyMinutes <= 30 ? 1 : dailyMinutes <= 60 ? 2 : dailyMinutes <= 120 ? 3 : 4;
        
        // Génération de plan basée sur les cours disponibles
        const subjects = Object.keys(COURSES_DATA);
        const planTasks = [];
        
        for (let i = 0; i < planDays; i++) {
            const currentDay = new Date();
            currentDay.setDate(today.getDate() + i);
            const dateStr = currentDay.toISOString().split('T')[0];
            
            for (let t = 0; t < taskCount; t++) {
                const subject = subjects[(i + t) % subjects.length];
                const lessons = COURSES_DATA[subject];
                const lesson = lessons[(i + t) % lessons.length];
                
                planTasks.push({
                    task_date: dateStr,
                    subject: subject,
                    chapter: lesson.title,
                    skill: "Consolidation",
                    task_type: this.getTaskTypeByProfile(user.main_learning_profile, planDays - i),
                    title: `Révision : ${lesson.title}`,
                    description: `Séance ciblée sur ${lesson.title} (${subject}).`,
                    estimated_minutes: Math.floor(dailyMinutes / taskCount),
                    priority: 1
                });
            }
        }

        return {
            plan: {
                title: `Plan ${user.bac_session === 'rattrapage' ? 'Rattrapage' : 'Bac National'}`,
                plan_type: user.bac_session === 'rattrapage' ? 'rattrapage' : 'national',
                target_exam_date: targetDate.toISOString().split('T')[0],
                daily_time_minutes: dailyMinutes
            },
            tasks: planTasks
        };
    },

    getTaskTypeByProfile(profile, daysLeft) {
        if (daysLeft < 7) return profile === 'stratege_bac' ? 'annale' : 'flashcards';
        if (profile === 'praticien') return 'exercice_guide';
        if (profile === 'architecte_visuel') return 'cours';
        if (profile === 'stratege_bac') return 'annale';
        return 'exercice_guide';
    },

    async saveRevisionPlan(userId, generated) {
        try {
            // Désactiver anciens plans
            await supabaseClient.from('student_revision_plans').update({ active: false }).eq('user_id', userId);
            
            const { data: plan, error: pError } = await supabaseClient
                .from('student_revision_plans')
                .insert([{ ...generated.plan, user_id: userId }])
                .select().single();
            
            if (pError) throw pError;
            
            const tasks = generated.tasks.map(t => ({ ...t, plan_id: plan.id, user_id: userId }));
            const { error: tError } = await supabaseClient.from('student_revision_tasks').insert(tasks);
            if (tError) throw tError;
            
            return plan;
        } catch (e) { console.error("Save Plan Error", e); return null; }
    },

    async loadTodayTasks(userId) {
        const today = new Date().toISOString().split('T')[0];
        try {
            const { data, error } = await supabaseClient
                .from('student_revision_tasks')
                .select('*')
                .eq('user_id', userId)
                .eq('task_date', today)
                .neq('status', 'done')
                .order('priority', { ascending: false });
            return data || [];
        } catch (e) { return []; }
    },

    async markTaskDone(taskId) {
        try {
            await supabaseClient
                .from('student_revision_tasks')
                .update({ status: 'done', completed_at: new Date() })
                .eq('id', taskId);
            return true;
        } catch (e) { return false; }
    }
};
