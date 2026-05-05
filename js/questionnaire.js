const ADAPTIVE_QUIZ = [
    {
        question: "Quand tu ne comprends pas un cours, ce qui t’aide le plus est :",
        options: [
            { text: "Un schéma, tableau ou résumé bien organisé", score: "architecte_visuel" },
            { text: "Un exercice corrigé étape par étape", score: "praticien" },
            { text: "Une explication depuis le début", score: "reconstructeur" },
            { text: "Un exemple type Bac National", score: "stratege_bac" },
            { text: "Une fiche courte ou des flashcards", score: "memorisateur_fragile" },
            { text: "Quelqu’un qui explique doucement sans me stresser", score: "anxieux_bloque" }
        ]
    },
    {
        question: "Quand tu révises, tu fais surtout :",
        options: [
            { text: "Des fiches", score: "architecte_visuel" },
            { text: "Beaucoup d’exercices", score: "praticien" },
            { text: "Je reprends le cours de A à Z", score: "reconstructeur" },
            { text: "Des anciens examens du Bac", score: "stratege_bac" },
            { text: "Des résumés à mémoriser", score: "memorisateur_fragile" },
            { text: "J’essaie mais je me sens vite perdu", score: "anxieux_bloque" }
        ]
    },
    {
        question: "Ton plus grand problème aujourd’hui :",
        options: [
            { text: "Je ne vois pas la structure du chapitre", score: "architecte_visuel" },
            { text: "Je bloque dans les exercices", score: "praticien" },
            { text: "Je n’ai pas les bases", score: "reconstructeur" },
            { text: "Je perds des points dans la rédaction", score: "stratege_bac" },
            { text: "J’oublie vite", score: "memorisateur_fragile" },
            { text: "Je stresse ou je manque de confiance", score: "anxieux_bloque" }
        ]
    },
    {
        question: "Quand tu vois une correction, tu préfères :",
        options: [
            { text: "Un plan clair avec les étapes", score: "architecte_visuel" },
            { text: "Une méthode que je peux refaire", score: "praticien" },
            { text: "Une explication détaillée ligne par ligne", score: "reconstructeur" },
            { text: "Le barème et les pièges du Bac", score: "stratege_bac" },
            { text: "Les erreurs à retenir", score: "memorisateur_fragile" },
            { text: "Une correction progressive et rassurante", score: "anxieux_bloque" }
        ]
    },
    {
        question: "Ton objectif principal :",
        options: [
            { text: "Organiser mes idées", score: "architecte_visuel" },
            { text: "Savoir résoudre les exercices", score: "praticien" },
            { text: "Reprendre les bases", score: "reconstructeur" },
            { text: "Gagner le maximum de points au National", score: "stratege_bac" },
            { text: "Mémoriser efficacement", score: "memorisateur_fragile" },
            { text: "Reprendre confiance", score: "anxieux_bloque" },
            { text: "Viser une excellente note", score: "performer" }
        ]
    },
    {
        question: "Ton niveau actuel :",
        options: [
            { text: "Je comprends si c’est bien organisé", score: "architecte_visuel" },
            { text: "Je comprends mais j’ai besoin de pratiquer", score: "praticien" },
            { text: "J’ai beaucoup de bases à reprendre", score: "reconstructeur" },
            { text: "Je suis moyen/bon mais je veux réussir le Bac", score: "stratege_bac" },
            { text: "Je comprends mais j’oublie", score: "memorisateur_fragile" },
            { text: "Je manque de confiance", score: "anxieux_bloque" },
            { text: "Je maîtrise déjà pas mal et je veux aller plus loin", score: "performer" }
        ]
    },
    {
        question: "Combien de temps peux-tu réviser par jour ?",
        options: [
            { text: "Moins de 30 min", value: 20 },
            { text: "30 min à 1h", value: 45 },
            { text: "1h à 2h", value: 90 },
            { text: "2h à 4h", value: 180 },
            { text: "Plus de 4h", value: 240 }
        ]
    },
    {
        question: "Tu prépares :",
        options: [
            { text: "Le Bac National", value: "national" },
            { text: "Le rattrapage", value: "rattrapage" },
            { text: "Les deux, je veux être prêt dans tous les cas", value: "national_et_rattrapage" }
        ]
    }
];

const questionnaire = {
    currentStep: 0,
    answers: [],

    init() {
        this.renderStep();
        const nextBtn = document.getElementById('next-step');
        const prevBtn = document.getElementById('prev-step');
        if(nextBtn) nextBtn.onclick = () => this.next();
        if(prevBtn) prevBtn.onclick = () => this.prev();
    },

    renderStep() {
        const step = ADAPTIVE_QUIZ[this.currentStep];
        const container = document.getElementById('quiz-step-content');
        const progress = document.getElementById('quiz-progress');
        const bar = document.getElementById('progress-bar');

        if(progress) progress.innerText = `Étape ${this.currentStep + 1} sur ${ADAPTIVE_QUIZ.length}`;
        if(bar) bar.style.width = `${((this.currentStep + 1) / ADAPTIVE_QUIZ.length) * 100}%`;

        let html = `<h3 style="margin-bottom:20px; font-size:1.1rem;">${step.question}</h3>`;
        step.options.forEach((opt, index) => {
            html += `
                <label class="plan-day" style="cursor:pointer; display:flex; align-items:center; gap:12px; margin-bottom:10px;">
                    <input type="radio" name="quiz-opt" value="${index}" ${this.answers[this.currentStep] == index ? 'checked' : ''}>
                    <span>${opt.text}</span>
                </label>
            `;
        });
        if(container) container.innerHTML = html;

        const prevBtn = document.getElementById('prev-step');
        const nextBtn = document.getElementById('next-step');
        if(prevBtn) prevBtn.style.display = this.currentStep === 0 ? 'none' : 'block';
        if(nextBtn) nextBtn.innerText = this.currentStep === ADAPTIVE_QUIZ.length - 1 ? "Terminer le diagnostic" : "Suivant";
    },

    next() {
        const selected = document.querySelector('input[name="quiz-opt"]:checked');
        if (!selected) return alert("Choisis une option pour continuer.");

        this.answers[this.currentStep] = parseInt(selected.value);

        if (this.currentStep < ADAPTIVE_QUIZ.length - 1) {
            this.currentStep++;
            this.renderStep();
        } else {
            this.finish();
        }
    },

    prev() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderStep();
        }
    },

    async finish() {
        const nextBtn = document.getElementById('next-step');
        if(nextBtn) {
            nextBtn.innerText = "Analyse en cours...";
            nextBtn.disabled = true;
        }

        const results = this.calculateResults();
        
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if(!user) throw new Error("Non connecté");

            const { error } = await supabaseClient
                .from('profiles')
                .update({
                    ...results,
                    quiz_completed: true,
                    updated_diagnostic_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;
            window.location.href = 'diagnostic.html';
        } catch (err) {
            console.error("Save error:", err);
            alert("Erreur lors de la sauvegarde. Réessaie.");
            if(nextBtn) {
                nextBtn.disabled = false;
                nextBtn.innerText = "Terminer le diagnostic";
            }
        }
    },

    calculateResults() {
        const scores = {
            architecte_visuel: 0,
            praticien: 0,
            reconstructeur: 0,
            stratege_bac: 0,
            memorisateur_fragile: 0,
            anxieux_bloque: 0,
            performer: 0
        };

        let dailyTime = 0;
        let bacSession = 'national';
        let stress = 0;
        let confidence = 5;

        this.answers.forEach((ansIndex, stepIndex) => {
            const opt = ADAPTIVE_QUIZ[stepIndex].options[ansIndex];
            
            if (opt.score) {
                scores[opt.score]++;
            }

            if (stepIndex === 6) dailyTime = opt.value;
            if (stepIndex === 7) bacSession = opt.value;

            if (opt.score === 'anxieux_bloque') stress += 2;
            if (stepIndex === 4 || stepIndex === 5) {
                if (opt.score === 'performer' || opt.score === 'stratege_bac') confidence += 2;
                if (opt.score === 'anxieux_bloque' || opt.score === 'reconstructeur') confidence -= 2;
            }
        });

        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        
        return {
            main_learning_profile: sorted[0][0],
            secondary_learning_profile: sorted[1][0],
            profile_scores: scores,
            daily_time_minutes: dailyTime,
            bac_session: bacSession,
            stress_level: Math.min(10, Math.max(0, stress)),
            confidence_level: Math.min(10, Math.max(0, confidence))
        };
    }
};
