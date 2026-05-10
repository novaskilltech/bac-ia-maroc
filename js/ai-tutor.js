const aiTutor = {
    userProfile: null,
    currentMessages: [],
    currentChatId: null,
    currentCourse: null,
    currentSubject: null,

    init(profile) {
        this.userProfile = profile;
        this.currentLang = profile.lang || 'fr';
        this.renderInitialMessage();
        this.loadHistory();
    },

    renderInitialMessage() {
        const container = document.getElementById('ai-messages-main');
        if (container) {
            container.innerHTML = '';
            this.currentMessages = [];
            this.addMessageToMain('ai', `Bonjour **${this.userProfile.firstname}** ! Je suis ton tuteur spécialisé pour le Bac Maroc. Comment puis-je t'aider aujourd'hui ?`);
        }
    },

    async callGeminiAPI(prompt) {
        const user = this.userProfile || {};
        const langMap = {
            'fr': 'Français',
            'ar': 'Arabe Classique',
            'darija': 'Darija Marocaine (en caractères arabes ou latins selon la demande)'
        };
        const langName = langMap[this.currentLang] || 'Français';

        // 1. Charger la mémoire pédagogique (erreurs + maîtrise)
        const memory = await this.loadLearningMemory(user.id, this.currentSubject, this.currentCourse);
        const memoryText = this.formatLearningMemoryForPrompt(memory);

        // 2. Construire le prompt avec la mémoire
        const systemPrompt = this.buildDynamicPrompt(user, langName, memoryText);

        // On récupère la clé depuis le localStorage pour éviter de la mettre en dur dans le code (Sécurité Git)
        let GEMINI_API_KEY = localStorage.getItem('GEMINI_API_KEY');

        if (!GEMINI_API_KEY) {
            console.error("Clé API Gemini manquante. Configurez-la avec : localStorage.setItem('GEMINI_API_KEY', 'votre_cle')");
            throw new Error("Clé AI non configurée.");
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "contents": [
                        { "role": "user", "parts": [{ "text": `${systemPrompt}\n\nQUESTION DE L'ÉLÈVE : ${prompt}` }] }
                    ],
                    "generationConfig": {
                        "temperature": 0.7,
                        "maxOutputTokens": 2048
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || "Erreur API Gemini");
            }

            const data = await response.json();
            const rawResponse = data.candidates[0].content.parts[0].text;

            // 3. Extraire et traiter le signal pédagogique invisible
            const signal = this.extractLearningSignal(rawResponse);
            if (signal) {
                this.saveLearningSignal(user.id, signal);
            }

            // 4. Nettoyer la réponse pour l'élève
            const cleanResponse = this.cleanAIResponse(rawResponse);

            // Add to history state
            this.currentMessages.push({ role: 'user', content: prompt });
            this.currentMessages.push({ role: 'assistant', content: cleanResponse });

            return cleanResponse;
        } catch (error) {
            console.error("AI Error:", error);
            throw error;
        }
    },

    async loadLearningMemory(userId, subject, chapter) {
        try {
            // Charger les 5 dernières erreurs non résolues
            const { data: errors } = await supabaseClient
                .from('student_error_logs')
                .select('*')
                .eq('user_id', userId)
                .eq('resolved', false)
                .limit(5)
                .order('created_at', { ascending: false });

            // Charger les notions avec maîtrise faible (< 0.6)
            const { data: mastery } = await supabaseClient
                .from('student_mastery')
                .select('*')
                .eq('user_id', userId)
                .lt('mastery_score', 0.6)
                .limit(5);

            return { recentErrors: errors || [], weakSkills: mastery || [] };
        } catch (err) {
            console.error("Memory Load Error:", err);
            return { recentErrors: [], weakSkills: [] };
        }
    },

    formatLearningMemoryForPrompt(memory) {
        if (memory.recentErrors.length === 0 && memory.weakSkills.length === 0) return "";

        let text = "\n\nMÉMOIRE PÉDAGOGIQUE :\nErreurs récentes à surveiller :\n";
        memory.recentErrors.forEach(e => {
            text += `- ${e.skill} (${e.error_type}) : ${e.note}\n`;
        });

        if (memory.weakSkills.length > 0) {
            text += "\nNotions à renforcer (Maîtrise faible) :\n";
            memory.weakSkills.forEach(m => {
                text += `- ${m.skill} : ${Math.round(m.mastery_score * 100)}%\n`;
            });
        }

        text += "\nCONSIGNE MÉMOIRE : Si l'élève refait une erreur listée ci-dessus, rappelle-la doucement. Si une notion est faible, commence par une vérification courte avant d'avancer.";
        return text;
    },

    extractLearningSignal(text) {
        const regex = /<learning_signal>([\s\S]*?)<\/learning_signal>/;
        const match = text.match(regex);
        if (match && match[1]) {
            try {
                return JSON.parse(match[1].trim());
            } catch (e) {
                console.error("Signal Parse Error:", e);
                return null;
            }
        }
        return null;
    },

    cleanAIResponse(text) {
        return text.replace(/<learning_signal>[\s\S]*?<\/learning_signal>/g, '').trim();
    },

    async saveLearningSignal(userId, signal) {
        if (!signal) return;

        try {
            // 1. Sauvegarder les erreurs
            if (signal.errors && signal.errors.length > 0) {
                const errorsToInsert = signal.errors.map(e => ({
                    user_id: userId,
                    subject: e.subject || this.currentSubject,
                    chapter: e.chapter || this.currentCourse,
                    skill: e.skill,
                    error_type: e.error_type,
                    severity: e.severity || 1,
                    note: e.note,
                    ai_feedback: e.ai_feedback
                }));
                await supabaseClient.from('student_error_logs').insert(errorsToInsert);
            }

            // 2. Mettre à jour la maîtrise
            if (signal.mastery_updates && signal.mastery_updates.length > 0) {
                for (const u of signal.mastery_updates) {
                    const { data: current } = await supabaseClient
                        .from('student_mastery')
                        .select('mastery_score')
                        .match({ user_id: userId, skill: u.skill })
                        .single();

                    const newScore = Math.min(1, Math.max(0, (current?.mastery_score || 0.5) + (u.delta || 0)));

                    await supabaseClient.from('student_mastery').upsert({
                        user_id: userId,
                        skill: u.skill,
                        mastery_score: newScore,
                        last_practiced_at: new Date()
                    });
                }
            }

            // 3. Marquer les erreurs résolues (optionnel dans le signal)
            if (signal.resolved_errors && signal.resolved_errors.length > 0) {
                for (const res of signal.resolved_errors) {
                    await supabaseClient
                        .from('student_error_logs')
                        .update({ resolved: true })
                        .eq('user_id', userId)
                        .eq('skill', res.skill)
                        .eq('resolved', false);
                }
            }
        } catch (e) {
            console.error("Signal save error", e);
        }
    },

    buildDynamicPrompt(user, lang, memoryText) {
        const mainProfile = user.main_learning_profile || 'praticien';
        const trackInfo = user.track || '';
        const isBIOF = trackInfo.includes('BIOF');
        const taskCtx = this.currentTask ? `\nTÂCHE ACTUELLE : ${this.currentTask.title} (${this.currentTask.task_type}).` : "";

        const langInstructions = {
            'fr': 'Réponds en Français. Rigueur et clarté.',
            'ar': 'Réponds en Arabe Classique (Fusha). Utilise les termes techniques officiels du Bac Marocain en Arabe.',
            'darija': 'Réponds en Darija Marocaine EN CARACTÈRES ARABES UNIQUEMENT (pas de lettres latines/arabizi). Sois proche de l\'élève, utilise un ton amical et pédagogique.'
        };

        const curriculumCtx = isBIOF
            ? "L'élève suit le programme BIOF (Bac International - Option Français). Les termes scientifiques sont en Français."
            : "L'élève suit le programme ARABE. Les termes scientifiques et les examens sont en Arabe.";

        return `Tu es un tuteur expert et polyglotte du Baccalauréat Marocain.
L'élève s'appelle ${user.firstname}. Filière : ${trackInfo}.
${curriculumCtx}
IMPORTANT : Même si l'élève est en section BIOF, tu DOIS impérativement répondre en ${lang} si c'est la langue choisie.
Tu maîtrises parfaitement le Français, l'Arabe et la Darija. N'invente aucune règle interdisant l'usage de l'Arabe ou de la Darija.
${langInstructions[this.currentLang] || ''}
Profil : ${mainProfile.toUpperCase()}.
${memoryText}${taskCtx}

RÈGLES :
- Ne donne jamais une grande fiche complète d'emblée. Avance par petites étapes.
- Adapte ta pédagogie au profil. Utilise les erreurs passées pour personnaliser.
- Si une notion faible apparaît, commence par une vérification courte.
- Après chaque explication, pose une question ou propose une mini-action.
- Garde la rigueur du Bac Marocain.

SIGNAL TECHNIQUE (À la fin si nécessaire) :
<learning_signal>
{
  "errors": [{ "skill": "...", "error_type": "...", "severity": 1, "note": "...", "ai_feedback": "..." }],
  "mastery_updates": [{ "skill": "...", "delta": -0.05, "reason": "..." }]
}
</learning_signal>

Utilise LaTeX ($...$ pour l'inline et $$...$$ pour les blocs) pour les maths. Ne mets jamais de texte normal à l'intérieur des balises mathématiques.`;
    },

    getProfileInstructions(profile) {
        const instructions = {
            architecte_visuel: "- Utiliser des tableaux et plans structurés.\n- Éviter les longs paragraphes.",
            praticien: "- Commencer par un mini-défi.\n- Proposer des exercices guidés.",
            reconstructeur: "- Reprendre depuis les bases.\n- Utiliser des exemples simples.",
            stratege_bac: "- Relier au Bac National (barème, pièges, rédaction).",
            memorisateur_fragile: "- Utiliser rappel actif et mini-quiz.",
            anxieux_bloque: "- Réduire la charge mentale, rassurer, valoriser.",
            performer: "- Exercices exigeants, variantes complexes, rigueur 20/20."
        };
        return instructions[profile] || "";
    },

    async startPlanningTask(task) {
        this.currentTask = task;
        this.currentCourse = task.chapter;
        this.currentSubject = task.subject;
        const msg = `Je commence ma tâche de révision : **${task.title}** en ${task.subject} (${task.chapter}). C'est une séance de type *${task.task_type}*. Aide-moi à réussir !`;
        this.sendMessageFromMain(msg);
    },

    async sendMessageFromMain(text) {
        // Détecter un changement de langue
        const lowerText = text.toLowerCase();
        if (lowerText.includes("parle en darija") || lowerText.includes("hder b darija")) {
            this.currentLang = 'darija';
            this.addMessageToMain('ai', "Wakha a sidi/lalla! Men daba l'fou9 ghadi nhder m3ak b **Darija**. Kifach n9der n3awnk?");
            return;
        } else if (lowerText.includes("parle en arabe") || lowerText.includes("tkellem b l3arbia")) {
            this.currentLang = 'ar';
            this.addMessageToMain('ai', "حسناً، سأتحدث معك باللغة **العربية** من الآن فصاعداً. كيف يمكنني مساعدتك؟");
            return;
        } else if (lowerText.includes("parle en français") || lowerText.includes("parle français")) {
            this.currentLang = 'fr';
            this.addMessageToMain('ai', "D'accord, je vais maintenant te répondre en **Français**. Comment puis-je t'aider ?");
            return;
        }

        this.addMessageToMain('user', text);
        const loadingId = 'loading-' + Date.now();
        this.addMessageToMain('ai', `<div class="skeleton" style="height:40px; width:90%"></div>`, loadingId);
        try {
            const response = await this.callGeminiAPI(text);
            this.removeMessageFromMain(loadingId);
            this.addMessageToMain('ai', response);
        } catch (e) {
            this.removeMessageFromMain(loadingId);
            this.addMessageToMain('ai', "Erreur de connexion.");
        }
    },

    addMessageToMain(role, text, id = null) {
        const container = document.getElementById('ai-messages-main');
        if (!container) return;
        const div = document.createElement('div');
        div.className = `msg-${role} animate`;
        if (id) div.id = id;
        div.style.padding = "12px 18px";
        div.style.borderRadius = "18px";
        div.style.marginBottom = "10px";
        div.style.maxWidth = "85%";
        if (role === 'user') {
            div.style.alignSelf = "flex-end";
            div.style.background = "var(--primary-gradient)";
            div.style.color = "white";
            div.innerText = text;
        } else {
            div.style.alignSelf = "flex-start";
            div.style.background = "var(--card-bg)";
            div.style.color = "var(--text-main)";
            div.style.border = "1px solid var(--glass-border)";
            if (text.includes('skeleton')) div.innerHTML = text;
            else div.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
            if (window.renderMathInElement) {
                renderMathInElement(div, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                });
            }
        }
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    removeMessageFromMain(id) { const el = document.getElementById(id); if (el) el.remove(); },

    async askAboutCourse(title, subject) {
        this.currentCourse = title;
        this.currentSubject = subject;
        this.sendMessageFromMain(`Génère ma fiche de révision pour le cours : **${title}** en ${subject}.`);
    },

    newChat() {
        if (this.currentMessages.length > 0 && !this.currentChatId) {
            if (confirm("Voulez-vous sauvegarder votre discussion actuelle avant d'en commencer une nouvelle ?")) {
                this.saveCurrentChat();
                return;
            }
        }
        this.currentChatId = null;
        this.renderInitialMessage();
    },

    async saveCurrentChat() {
        if (this.currentMessages.length === 0) return;
        const title = this.currentMessages[0].content.substring(0, 30) + "...";
        const btn = document.getElementById('save-chat-btn');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>...';

        try {
            const { data, error } = await supabaseClient
                .from('chats')
                .upsert({
                    id: this.currentChatId || undefined,
                    user_id: this.userProfile.id,
                    title: title,
                    messages: this.currentMessages,
                    updated_at: new Date()
                })
                .select().single();

            if (error) throw error;
            this.currentChatId = data.id;
            if (btn) btn.innerHTML = '<i class="fa-solid fa-check"></i> OK';
            setTimeout(() => { if (btn) btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Sauvegarder'; }, 2000);
            this.loadHistory();
        } catch (err) {
            console.error("Save Error:", err);
            if (btn) btn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        }
    },

    async loadHistory() {
        const container = document.getElementById('chat-history-list');
        if (!container || !this.userProfile) return;

        try {
            const { data, error } = await supabaseClient
                .from('chats')
                .select('*')
                .eq('user_id', this.userProfile.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            container.innerHTML = '';
            data.forEach(chat => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.style.padding = "10px";
                item.style.marginBottom = "5px";
                item.style.borderRadius = "8px";
                item.style.background = "rgba(255,255,255,0.03)";
                item.style.cursor = "pointer";
                item.style.fontSize = "0.8rem";
                item.innerHTML = `<div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${chat.title}</div>`;
                item.onclick = () => this.openChat(chat);
                container.appendChild(item);
            });
        } catch (err) { console.error("History Error:", err); }
    },

    openChat(chat) {
        this.currentChatId = chat.id;
        this.currentMessages = chat.messages;
        const container = document.getElementById('ai-messages-main');
        if (container) {
            container.innerHTML = '';
            this.currentMessages.forEach(msg => this.addMessageToMain(msg.role, msg.content));
        }
    },

    async askQuickPrompt(promptText) {
        let descriptivePrompt = promptText;
        if (promptText === "Rédige-moi 3 exercices (Progressif)") {
            descriptivePrompt = "Rédige-moi 3 exercices de difficulté différente sur ce cours, du plus facile au plus dur, pour bien m'entraîner.";
        } else if (promptText === "Facilite-moi l'explication") {
            descriptivePrompt = "Facilite-moi l'explication de ce cours comme si j'avais 10 ans, avec des exemples très simples.";
        }

        let finalPrompt = descriptivePrompt;
        if (this.currentCourse) {
            finalPrompt = `${descriptivePrompt} concernant le cours de "${this.currentCourse}" ${this.currentSubject ? `en ${this.currentSubject}` : ''}.`;
        }
        this.sendMessageFromMain(finalPrompt);
    },

    async generateQuiz(courseTitle, subject = "") {
        const systemPrompt = `Tu es un examinateur du Bac Maroc.
        Génère un Quiz interactif (QCM) de 5 questions sur le cours : "${courseTitle}" ${subject ? `en ${subject}` : ''}.
        STRUCTURE JSON STRICTE :
        [{"question": "...", "options": ["A", "B", "C", "D"], "answer": 0, "explanation": "..."}]`;
        try {
            const response = await this.callGeminiAPI(systemPrompt);
            const cleanJson = response.replace(/```json|```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) { throw e; }
    },

    async startQuizFlow() {
        if (!this.currentCourse) {
            this.addMessageToMain('ai', "Choisis d'abord un cours pour lancer un quiz !");
            return;
        }
        const loadingId = 'quiz-loading-' + Date.now();
        this.addMessageToMain('ai', `<div class="skeleton" style="height:40px; width:100%"></div>`, loadingId);
        try {
            const quizData = await this.generateQuiz(this.currentCourse, this.currentSubject);
            this.removeMessageFromMain(loadingId);
            this.renderQuizInChat(quizData);
        } catch (e) {
            this.removeMessageFromMain(loadingId);
            this.addMessageToMain('ai', "Erreur lors de la génération du quiz.");
        }
    },

    renderQuizInChat(quizData) {
        const quizId = 'quiz-' + Date.now();
        const container = document.createElement('div');
        container.id = quizId;
        container.className = 'bento-item animate';
        container.style.marginTop = "15px";
        container.style.border = "1px solid var(--primary)";

        window.currentQuiz = { data: quizData, score: 0, currentIdx: 0, id: quizId };
        this.nextQuizQuestion(quizId, 0);
        document.getElementById('ai-messages-main').appendChild(container);
    },

    nextQuizQuestion(quizId, idx) {
        const quiz = window.currentQuiz;
        const q = quiz.data[idx];
        const container = document.getElementById(quizId);
        container.innerHTML = `
            <div style="font-weight:700; margin-bottom:15px;">${q.question}</div>
            <div style="display:grid; gap:8px;">
                ${q.options.map((opt, i) => `
                    <button onclick="aiTutor.handleQuizAnswer('${quizId}', ${idx}, ${i})" class="prompt-box" style="width:100%; text-align:left;">
                        ${opt}
                    </button>
                `).join('')}
            </div>
        `;
    },

    handleQuizAnswer(quizId, qIdx, selectedIdx) {
        const quiz = window.currentQuiz;
        const q = quiz.data[qIdx];
        const container = document.getElementById(quizId);
        const isCorrect = selectedIdx === q.answer;
        if (isCorrect) quiz.score++;

        container.innerHTML = `
            <div style="color:${isCorrect ? '#10b981' : '#ef4444'}; font-weight:700; margin-bottom:10px;">
                ${isCorrect ? 'Correct !' : 'Incorrect.'}
            </div>
            <p style="font-size:0.8rem; margin-bottom:15px;">${q.explanation}</p>
            ${qIdx < quiz.data.length - 1
                ? `<button onclick="aiTutor.nextQuizQuestion('${quizId}', ${qIdx + 1})" class="btn-ai-small" style="width:100%">Question Suivante</button>`
                : `<div style="text-align:center; font-weight:800; font-size:1.2rem;">Score : ${quiz.score}/${quiz.data.length}</div>`
            }
        `;
    }
};
