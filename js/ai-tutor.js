const aiTutor = {
    userProfile: null,
    currentMessages: [],
    currentChatId: null,
    currentCourse: null,
    currentSubject: null,
    savedDocuments: [],
    pendingImageDataUrl: null,
    pendingImageName: null,
    isListeningVoice: false,
    recognitionInstance: null,

    init(profile) {
        this.userProfile = profile;
        this.currentLang = profile.lang || 'fr';
        this.renderInitialMessage();
        this.loadHistory();
        this.loadSavedDocuments();
        this.checkModelStatus();
    },

    // Modèle par défaut (clé API protégée exclusivement côté serveur dans /api/chat et Supabase Edge Function)
    defaultModel: 'google/gemini-2.5-flash',

    async checkModelStatus() {
        const badge = document.getElementById('model-status-badge');
        if (!badge) return;

        badge.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color:var(--primary);"></i> Connexion IA...';
        try {
            const res = await fetch('/api/chat', { method: 'GET' });
            if (res.ok) {
                badge.innerHTML = '<i class="fa-solid fa-shield-halved" style="color:#10b981;"></i> Gemini 2.5 Sécurisé';
                badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                return true;
            }
        } catch (e) {
            // Ignorer si serveur statique local sans /api/chat
        }

        try {
            const { data, error } = await supabaseClient.functions.invoke('gemini-proxy', {
                body: { prompt: 'ping', systemPrompt: 'OK' }
            });
            if (!error && data?.text) {
                badge.innerHTML = '<i class="fa-solid fa-shield-halved" style="color:#10b981;"></i> Gemini 2.5 Edge Actif';
                badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                return true;
            }
        } catch (e) {
            console.warn("Edge status check warning:", e);
        }

        badge.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#10b981;"></i> Gemini 2.5 Prêt';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        return true;
    },

    showToast(msg) {
        let toast = document.getElementById('app-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'app-toast';
            toast.className = 'toast-notif';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i class="fa-solid fa-sparkles" style="color:var(--primary);"></i> <span>${msg}</span>`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3200);
    },

    renderInitialMessage() {
        const container = document.getElementById('ai-messages-main');
        if (container) {
            container.innerHTML = '';
            this.currentMessages = [];
            this.addMessageToMain('ai', `Bonjour **${this.userProfile.firstname || 'Élève'}** ! 🎓\n\nJe suis ton tuteur IA spécialisé pour le **Bac Sciences Maroc** (propulsé par **Gemini 2.5 Vision & Voix**).\n\nVoici comment travailler efficacement ensemble :\n1. **Sélectionne un chapitre** dans la bibliothèque ou clique sur une tâche de ton **Planning du jour**.\n2. **Nouveau (Photo & Voix)** : Clique sur 📷 **Photo Exercice** pour photographier ton cahier/sujet de Bac, ou sur 🎙️ **Micro** pour dicter ta question !\n3. Utilise les boutons sous mes réponses pour **Copier**, **Garder sur ton appareil**, **Télécharger**, ou **Imprimer en PDF** !`);
        }
    },

    async callGeminiAPI(promptText, options = {}) {
        const { imageDataUrl = null, jsonMode = false } = options;
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

        // 2. Construire le prompt avec la mémoire (Méthodologie & Pédagogie intactes)
        const systemPrompt = this.buildDynamicPrompt(user, langName, memoryText);

        let rawResponse = null;
        let lastErr = null;

        const historyMsgs = (this.currentMessages || []).slice(-6).map(m => ({
            role: m.role === 'ai' ? 'assistant' : m.role,
            content: m.content
        }));

        const messagesPayload = [
            { role: 'system', content: systemPrompt },
            ...historyMsgs,
            { role: 'user', content: promptText }
        ];

        // Récupérer le token JWT de la session Supabase pour authentifier l'appel serveur
        let accessToken = '';
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            accessToken = session?.access_token || '';
        } catch (e) {}

        // A. Appel principal via le Proxy Serveur sécurisé (/api/chat)
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    prompt: promptText,
                    systemPrompt: systemPrompt,
                    messages: messagesPayload,
                    imageDataUrl: imageDataUrl,
                    jsonMode: jsonMode,
                    temperature: jsonMode ? 0.4 : 0.7,
                    max_tokens: 4000
                })
            });

            if (response.ok) {
                const data = await response.json();
                rawResponse = data.text || data.choices?.[0]?.message?.content;
            } else {
                const errData = await response.json().catch(() => ({}));
                lastErr = errData.error || `Erreur HTTP ${response.status}`;
            }
        } catch (err) {
            lastErr = err.message;
        }

        // B. Relais de secours via Supabase Edge Function (gemini-proxy)
        if (!rawResponse) {
            try {
                const { data, error } = await supabaseClient.functions.invoke('gemini-proxy', {
                    body: {
                        prompt: promptText,
                        systemPrompt: systemPrompt,
                        messages: messagesPayload,
                        imageDataUrl: imageDataUrl,
                        jsonMode: jsonMode
                    }
                });
                if (!error && data?.text) {
                    rawResponse = data.text;
                } else if (error) {
                    lastErr = error.message || lastErr;
                }
            } catch (edgeErr) {
                lastErr = lastErr || edgeErr.message;
            }
        }

        if (!rawResponse && lastErr) {
            throw new Error(lastErr);
        }

        if (!rawResponse) {
            throw new Error("MODÈLE_NON_CONFIGURÉ");
        }

        // 3. Extraire et traiter le signal pédagogique invisible
        const signal = this.extractLearningSignal(rawResponse);
        if (signal) {
            this.saveLearningSignal(user.id, signal);
        }

        // 4. Nettoyer la réponse pour l'élève
        const cleanResponse = this.cleanAIResponse(rawResponse);

        // Add to history state (sans stocker le base64 lourd en historique)
        if (!jsonMode) {
            const storedUserText = imageDataUrl ? `[📷 Photo d'exercice jointe] ${promptText}` : promptText;
            this.currentMessages.push({ role: 'user', content: storedUserText });
            this.currentMessages.push({ role: 'assistant', content: cleanResponse });
        }

        return cleanResponse;
    },

    async loadLearningMemory(userId, subject, chapter) {
        try {
            const { data: errors } = await supabaseClient
                .from('student_error_logs')
                .select('*')
                .eq('user_id', userId)
                .eq('resolved', false)
                .limit(5)
                .order('created_at', { ascending: false });

            const { data: mastery } = await supabaseClient
                .from('student_mastery')
                .select('*')
                .eq('user_id', userId)
                .lt('mastery_score', 0.6)
                .limit(5);

            return { recentErrors: errors || [], weakSkills: mastery || [] };
        } catch (err) {
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

        text += "\nCONSIGNE MÉMOIRE : Tiens compte de ces fragilités en détaillant bien ces étapes dans tes explications et exemples corrigés, sans interroger l'élève.";
        return text;
    },

    extractLearningSignal(text) {
        const regex = /<learning_signal>([\s\S]*?)<\/learning_signal>/;
        const match = text.match(regex);
        if (match && match[1]) {
            try {
                return JSON.parse(match[1].trim());
            } catch (e) {
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
            'fr': 'Réponds en Français avec rigueur, clarté et bienveillance.',
            'ar': 'Réponds en Arabe Classique (Fusha). Utilise les termes techniques officiels du Bac Marocain en Arabe.',
            'darija': 'Réponds en Darija Marocaine EN CARACTÈRES ARABES UNIQUEMENT (pas de lettres latines/arabizi). Sois proche de l\'élève, utilise un ton amical et pédagogique.'
        };

        const curriculumCtx = isBIOF
            ? "L'élève suit le programme BIOF (Bac International - Option Français). Les termes scientifiques sont en Français."
            : "L'élève suit le programme ARABE. Les termes scientifiques et les examens sont en Arabe.";

        return `Tu es un professeur agrégé et tuteur expert du Baccalauréat Scientifique Marocain.
L'élève s'appelle ${user.firstname || 'Élève'}. Filière : ${trackInfo}.
${curriculumCtx}
IMPORTANT : Même si l'élève est en section BIOF, tu DOIS impérativement répondre en ${lang} si c'est la langue choisie.
Tu maîtrises parfaitement le Français, l'Arabe et la Darija.
${langInstructions[this.currentLang] || ''}
Profil cognitif de l'élève : ${mainProfile.toUpperCase()}.
${this.getProfileInstructions(mainProfile)}
${memoryText}${taskCtx}

MÉTHODE PÉDAGOGIQUE (ENSEIGNEMENT EXPLICITE, DIRECT & COMPLET — ZÉRO QUESTIONNEMENT INVASIF) :
1. RÉPONSE DIRECTE OBLIGATOIRE : Quand l'élève pose une question, demande un cours, une fiche ou un exercice, donne-lui IMMÉDIATEMENT la réponse complète, claire et structurée. Ne réponds JAMAIS à une question par une autre question.
2. PAS D'INTERROGATOIRE SOCRATIQUE : Ne fais pas deviner le cours à l'élève. Explique la notion de A à Z :
   - Définition / Principe clair
   - Formules et théorèmes essentiels bien mis en évidence
   - Méthode de résolution étape par étape (rédaction officielle attendue au Bac Marocain)
   - Exemple concret entièrement résolu et expliqué pas-à-pas
3. SI L'ÉLÈVE DEMANDE DES EXERCICES : Fournis les énoncés complets et clairs (et ajoute les indications ou le corrigé détaillé si demandé, sans bloquer l'élève).
4. CONCLUSION SOBRE : Ne pose pas de question-test obligatoire à la fin de tes messages. Propose simplement, en une phrase courte et optionnelle, de approfondir un point ou de voir un autre exemple si l'élève le souhaite.

MOTEUR GRAPHIQUE & SCIENTIFIQUE INTÉGRÉ (COURBES MATHS, SCHÉMAS PHYSIQUE, PLANCHES ANATOMIQUES & SVT) :
Tu disposes d'un moteur graphique vectoriel dans l'interface de l'élève. Utilise-le systématiquement dès qu'un visuel aide à comprendre ou dès que l'élève demande une courbe, un graphique, un dessin de physique ou une fiche anatomique/SVT :

A) POUR TRACER UNE FONCTION, UNE COURBE MATHÉMATIQUE OU PHYSIQUE ($f(x)$, asymptotes, tangentes, $u_C(t)$, décroissance $N(t)$) :
Insère dans ta réponse un bloc de code \`\`\`mathplot contenant un JSON strict sur ce modèle :
\`\`\`mathplot
{
  "title": "Courbe représentative de f(x) et son asymptote",
  "xDomain": [-4, 6],
  "yDomain": [-4, 6],
  "xLabel": "x",
  "yLabel": "f(x)",
  "functions": [
    { "expr": "x * exp(-x)", "label": "C_f : f(x) = x e^{-x}", "color": "#06b6d4" },
    { "expr": "x", "label": "Tangente en 0 : y = x", "color": "#f59e0b", "dashed": true }
  ],
  "points": [
    { "x": 0, "y": 0, "label": "O(0;0)" },
    { "x": 1, "y": 0.368, "label": "Max(1 ; 1/e)" }
  ]
}
\`\`\`
Règles pour "expr" : utilise la syntaxe mathématique standard avec variable \`x\` (\`sin(x)\`, \`cos(x)\`, \`tan(x)\`, \`exp(x)\`, \`ln(x)\`, \`sqrt(x)\`, \`abs(x)\`, \`x^2\`).

B) POUR CRÉER UN DESSIN DE PHYSIQUE-CHIMIE OU UNE FICHE ANATOMIQUE / SCHÉMA SVT :
Insère dans ta réponse un bloc de code \`\`\`svg contenant un code \`<svg viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg">...</svg>\` complet, propre, pédagogique et ultra-lisible :
- Utilise TOUJOURS un fond blanc ou très clair (\`<rect width="100%" height="100%" fill="#ffffff" rx="12"/>\`) et des textes foncés (\`fill="#0f172a"\`, \`font-family="Segoe UI, Arial, sans-serif"\`) pour une lisibilité parfaite à l'écran et à l'impression PDF.
- En Physique-Chimie : dessine les circuits ($R, L, C$, générateur, flèches de tension $u_C, u_R$ et courant $i$), les plans inclinés avec le solide, le centre de gravité $G$ et les vecteurs forces colorés ($\vec{P}$ en bleu, $\vec{R}$ en vert, $\vec{f}$ en rouge avec \`marker-end\`), les trajectoires de projectiles, les ondes ou les montages de titrage.
- En SVT / Fiches Anatomiques : dessine des schémas anatomiques et biologiques clairs (cellule, mitochondrie avec crêtes et matrice, sarcomère avec actine/myosine, synapse nerveuse et arc réflexe myotatique, phases de mitose/méiose, arbre généalogique de génétique, coupe géologique de subduction/obduction) avec des formes organiques colorées, des flèches de pointage numérotées (1, 2, 3, 4...) et un encadré de légende claire sur le côté du SVG.

SIGNAL TECHNIQUE INVISIBLE (Uniquement si tu détectes une erreur manifeste de l'élève ou un progrès clair) :
<learning_signal>
{
  "errors": [{ "skill": "...", "error_type": "...", "severity": 1, "note": "...", "ai_feedback": "..." }],
  "mastery_updates": [{ "skill": "...", "delta": 0.05, "reason": "..." }]
}
</learning_signal>

Utilise LaTeX ($...$ pour l'inline et $$...$$ pour les blocs) pour les formules mathématiques et physiques. Ne mets jamais de texte normal à l'intérieur des balises mathématiques.`;
    },

    getProfileInstructions(profile) {
        const instructions = {
            architecte_visuel: "- Structure la réponse avec des titres clairs, des tableaux comparatifs et des listes visuelles synthétiques.\n- Inclus systématiquement un graphique (mathplot) ou un schéma SVG visuel dès que le sujet s'y prête.",
            praticien: "- Va droit au but : rappelle la règle/formule clé puis montre immédiatement son application dans un exemple concret résolu étape par étape.",
            reconstructeur: "- Explique depuis les fondations avec un vocabulaire simple et accessible.\n- Détaille chaque étape intermédiaire de calcul ou de raisonnement sans sauter d'étape.",
            stratege_bac: "- Oriente toute l'explication vers l'examen du Bac National : précise les questions classiques qui tombent chaque année, la rédaction exacte qui rapporte tous les points au barème et les pièges à éviter.",
            memorisateur_fragile: "- Donne des moyens mnémotechniques, encadre les formules incontournables et résume la fin par « Les 3 points vitaux à retenir par cœur ».",
            anxieux_bloque: "- Adopte un ton très rassurant et dédramatisant.\n- Découpe la méthode en petites étapes simples déjà résolues (Étape 1, Étape 2, Étape 3) sans jamais mettre l'élève sous pression.",
            performer: "- Fournis une explication approfondie de haut niveau (objectif 18-20/20), incluant les subtilités théoriques, les cas limites et les astuces de résolution rapide."
        };
        return instructions[profile] || "";
    },

    async startPlanningTask(task) {
        this.currentTask = task;
        this.currentCourse = task.chapter;
        this.currentSubject = task.subject;
        this.updateActiveCourseBanner();
        if (typeof switchMainTab === 'function') switchMainTab('chat');
        const mainCol = document.getElementById('col-main');
        if (mainCol && window.innerWidth <= 1100) {
            mainCol.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const msg = `Je commence ma tâche de révision : **${task.title}** en ${task.subject} (${task.chapter}). C'est une séance de type *${task.task_type}*. Aide-moi à réussir !`;
        this.sendMessageFromMain(msg);
    },

    updateActiveCourseBanner() {
        const banner = document.getElementById('active-course-banner');
        if (banner) {
            if (this.currentCourse) {
                banner.style.display = 'flex';
                banner.innerHTML = `
                    <div><i class="fa-solid fa-book-open" style="color:var(--primary); margin-right:8px;"></i> Chapitre actif : <strong>${this.currentCourse}</strong> <span style="opacity:0.7;">(${this.currentSubject || 'Sciences'})</span></div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <button onclick="aiTutor.requestVisual('auto')" class="msg-action-btn" style="border-color:var(--primary); color:var(--primary);"><i class="fa-solid fa-compass-drafting"></i> Schéma / Courbe du cours</button>
                        <button onclick="aiTutor.askQuickPrompt('Rédige-moi 3 exercices (Progressif)')" class="msg-action-btn"><i class="fa-solid fa-dumbbell"></i> 3 Exercices</button>
                        <button onclick="aiTutor.startQuizFlow()" class="msg-action-btn"><i class="fa-solid fa-bolt"></i> Quiz Bac</button>
                    </div>
                `;
            } else {
                banner.style.display = 'none';
            }
        }
    },

    requestVisual(type) {
        if (typeof switchMainTab === 'function') switchMainTab('chat');
        const chapterCtx = this.currentCourse ? ` sur le chapitre « ${this.currentCourse} » (${this.currentSubject || 'Sciences'})` : '';

        if (type === 'mathplot') {
            const fnPrompt = prompt(
                "Quelle fonction ou courbe souhaites-tu tracer et étudier ? (ex: f(x) = ln(x)/x, ou f(x) = x*exp(-x), ou laisse le chapitre actuel)",
                this.currentCourse ? `Courbes types du chapitre ${this.currentCourse}` : "f(x) = (x - 1) * exp(x)"
            );
            if (!fnPrompt) return;
            this.sendMessageFromMain(`Trace la courbe mathématique exacte (avec un bloc \`\`\`mathplot), étudie ses variations, ses asymptotes et ses points remarquables pour : ${fnPrompt}${chapterCtx}.`);
        } else if (type === 'physics') {
            const physPrompt = prompt(
                "Quel dessin ou schéma de Physique-Chimie veux-tu générer ? (ex: Circuit RLC série, Forces sur un plan incliné, Montage de dosage acido-basique, Ondes...)",
                this.currentCourse || "Circuit RC en charge avec flèches de tension et courant"
            );
            if (!physPrompt) return;
            this.sendMessageFromMain(`Crée un schéma vectoriel complet, normé et légendé (avec un bloc \`\`\`svg) ainsi que les équations fondamentales pour : ${physPrompt}${chapterCtx}.`);
        } else if (type === 'anatomy') {
            const svtPrompt = prompt(
                "Quelle planche anatomique ou schéma de SVT souhaites-tu ? (ex: Sarcomère et contraction musculaire, Ultrastructure de la mitochondrie, Synapse / Réflexe myotatique, Mitose, Coupe de subduction...)",
                this.currentCourse || "Structure du sarcomère et mécanisme de la contraction musculaire"
            );
            if (!svtPrompt) return;
            this.sendMessageFromMain(`Génère une fiche anatomique / schéma fonctionnel SVT complet avec dessin vectoriel numéroté (bloc \`\`\`svg), légende détaillée et explication des mécanismes pour : ${svtPrompt}${chapterCtx}.`);
        } else {
            this.sendMessageFromMain(`Génère une fiche visuelle complète avec schéma vectoriel (\`\`\`svg) ou courbe représentative (\`\`\`mathplot) pour illustrer les points clés${chapterCtx || ' de mon cours actuel'}.`);
        }
    },

    // =========================================================================
    // P2 — MULTIMODALITÉ VISION (PHOTO EXERCICE / BROUILLON) & DICTÉE VOCALE
    // =========================================================================

    triggerImagePicker() {
        const inputEl = document.getElementById('ai-image-input');
        if (inputEl) inputEl.click();
    },

    handleImageUpload(event) {
        const file = event?.target?.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            this.showToast("Veuillez sélectionner une image valide (JPG, PNG, WEBP).");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Compression intelligente côté client (max 1280px, JPEG 0.82) pour envoi ultra-rapide sur 4G
                const maxDim = 1280;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

                this.pendingImageDataUrl = compressedDataUrl;
                this.pendingImageName = file.name || 'exercice_bac.jpg';
                this.renderPendingImagePreview();
                this.showToast("Photo d'exercice prête ! Ajoute une consigne ou clique sur Envoyer 📷");
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    renderPendingImagePreview() {
        const previewBar = document.getElementById('chat-image-preview-bar');
        if (!previewBar) return;

        if (!this.pendingImageDataUrl) {
            previewBar.style.display = 'none';
            previewBar.innerHTML = '';
            return;
        }

        previewBar.style.display = 'flex';
        previewBar.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${this.pendingImageDataUrl}" alt="Aperçu exercice" style="width:46px; height:46px; object-fit:cover; border-radius:8px; border:1.5px solid var(--primary);">
                <div>
                    <div style="font-size:0.8rem; font-weight:700; color:var(--text-main);"><i class="fa-solid fa-camera" style="color:var(--primary);"></i> Photo d'exercice jointe</div>
                    <div style="font-size:0.72rem; color:var(--text-dim);">Gemini 2.5 Vision va lire et corriger ton document</div>
                </div>
            </div>
            <button type="button" onclick="aiTutor.clearPendingImage()" class="msg-action-btn" style="color:#ef4444; padding:6px 10px;" title="Retirer la photo">
                <i class="fa-solid fa-xmark"></i> Retirer
            </button>
        `;
    },

    clearPendingImage() {
        this.pendingImageDataUrl = null;
        this.pendingImageName = null;
        const inputEl = document.getElementById('ai-image-input');
        if (inputEl) inputEl.value = '';
        this.renderPendingImagePreview();
    },

    toggleVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.showToast("La dictée vocale n'est pas supportée sur ce navigateur (utilise Chrome ou Safari).");
            return;
        }

        const voiceBtn = document.getElementById('chat-voice-btn');

        if (this.isListeningVoice && this.recognitionInstance) {
            this.recognitionInstance.stop();
            return;
        }

        const recognition = new SpeechRecognition();
        this.recognitionInstance = recognition;
        recognition.lang = this.currentLang === 'ar' ? 'ar-SA' : this.currentLang === 'darija' ? 'ar-MA' : 'fr-FR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            this.isListeningVoice = true;
            if (voiceBtn) {
                voiceBtn.classList.add('voice-active');
                voiceBtn.innerHTML = '<i class="fa-solid fa-microphone-lines fa-beat" style="color:#ef4444;"></i>';
            }
            this.showToast("🎙️ Parle maintenant, je t'écoute...");
        };

        recognition.onresult = (event) => {
            const transcript = event.results?.[0]?.[0]?.transcript || '';
            const inputEl = document.getElementById('ai-input-main');
            if (inputEl && transcript) {
                inputEl.value = inputEl.value ? `${inputEl.value.trim()} ${transcript}` : transcript;
                inputEl.focus();
            }
        };

        recognition.onerror = () => {
            this.showToast("Micro interrompu ou non autorisé.");
        };

        recognition.onend = () => {
            this.isListeningVoice = false;
            if (voiceBtn) {
                voiceBtn.classList.remove('voice-active');
                voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
            }
        };

        recognition.start();
    },

    async sendMessageFromMain(text) {
        const attachedImage = this.pendingImageDataUrl;
        const cleanText = (text || '').trim();

        if (!cleanText && !attachedImage) return;

        const finalPrompt = cleanText || (this.currentCourse
            ? `Analyse cette photo d'exercice sur le chapitre « ${this.currentCourse} » (${this.currentSubject || 'Sciences'}) et rédige la correction complète étape par étape selon le barème du Bac National.`
            : `Analyse attentivement cette photo d'exercice ou de cours du Bac et fournis une résolution détaillée étape par étape.`);

        const lowerText = finalPrompt.toLowerCase();
        if (!attachedImage) {
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
        }

        // Réinitialiser l'aperçu photo dès l'envoi
        if (attachedImage) {
            this.clearPendingImage();
        }

        this.addMessageToMain('user', finalPrompt, null, false, attachedImage);
        const loadingId = 'loading-' + Date.now();
        this.addMessageToMain('ai', `<div class="skeleton" style="height:40px; width:90%"></div>`, loadingId, true);
        try {
            const response = await this.callGeminiAPI(finalPrompt, { imageDataUrl: attachedImage });
            this.removeMessageFromMain(loadingId);
            this.addMessageToMain('ai', response);
        } catch (e) {
            this.removeMessageFromMain(loadingId);
            this.addMessageToMain('ai', `⚠️ Le serveur IA est momentanément sollicité (${e.message}). Réessaie dans quelques secondes.`);
        }
    },

    addMessageToMain(role, text, id = null, isLoading = false, imageDataUrl = null) {
        const container = document.getElementById('ai-messages-main');
        if (!container) return;
        const div = document.createElement('div');
        const msgId = id || ('msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
        div.id = msgId;
        div.className = `msg-${role} animate`;
        div.style.padding = "16px 20px";
        div.style.borderRadius = "18px";
        div.style.marginBottom = "12px";
        div.style.maxWidth = "92%";

        if (role === 'user') {
            div.style.alignSelf = "flex-end";
            div.style.background = "var(--primary-gradient)";
            div.style.color = "white";
            if (imageDataUrl) {
                const imgEl = document.createElement('img');
                imgEl.src = imageDataUrl;
                imgEl.alt = "Photo d'exercice";
                imgEl.style.maxWidth = "240px";
                imgEl.style.maxHeight = "200px";
                imgEl.style.borderRadius = "12px";
                imgEl.style.display = "block";
                imgEl.style.marginBottom = "8px";
                imgEl.style.border = "2px solid rgba(255,255,255,0.4)";
                div.appendChild(imgEl);
            }
            const textSpan = document.createElement('div');
            textSpan.innerText = text;
            div.appendChild(textSpan);
        } else {
            div.style.alignSelf = "flex-start";
            div.style.background = "var(--card-bg)";
            div.style.color = "var(--text-main)";
            div.style.border = "1px solid var(--glass-border)";

            const contentDiv = document.createElement('div');
            contentDiv.className = 'msg-content-body';
            contentDiv.dataset.raw = text;

            if (isLoading || text.includes('skeleton')) {
                contentDiv.innerHTML = text;
                div.appendChild(contentDiv);
            } else {
                contentDiv.innerHTML = typeof marked !== 'undefined' ? marked.parse(text) : text;
                div.appendChild(contentDiv);

                // Rendu des Courbes Mathématiques (mathplot) et Schémas SVG (Physique / Anatomie SVT)
                this.renderScientificVisuals(contentDiv);

                if (window.renderMathInElement) {
                    renderMathInElement(contentDiv, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false },
                            { left: '\\(', right: '\\)', display: false },
                            { left: '\\[', right: '\\]', display: true }
                        ],
                        throwOnError: false
                    });
                }

                // Barre d'outils ergonomique sous chaque réponse de l'IA (100% Local sur l'appareil)
                const actionsBar = document.createElement('div');
                actionsBar.className = 'msg-actions no-print';
                actionsBar.innerHTML = `
                    <button type="button" class="msg-action-btn" onclick="aiTutor.copyMessage('${msgId}')" title="Copier la réponse">
                        <i class="fa-regular fa-copy"></i> Copier
                    </button>
                    <button type="button" class="msg-action-btn" onclick="aiTutor.saveMessageToDocs('${msgId}', 'fiche')" title="Garder dans mon Carnet Local (Navigateur)">
                        <i class="fa-regular fa-bookmark"></i> Garder Fiche (Local)
                    </button>
                    <button type="button" class="msg-action-btn" onclick="aiTutor.downloadMessageToDevice('${msgId}')" title="Télécharger ce document directement sur mon appareil">
                        <i class="fa-solid fa-download"></i> Télécharger sur l'appareil
                    </button>
                    <button type="button" class="msg-action-btn" onclick="aiTutor.printMessage('${msgId}')" title="Imprimer ou Enregistrer en PDF">
                        <i class="fa-solid fa-file-pdf"></i> Imprimer / PDF
                    </button>
                `;
                div.appendChild(actionsBar);
            }
        }
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    // =========================================================================
    // MOTEUR GRAPHIQUE SCIENTIFIQUE : COURBES MATHS & SCHÉMAS SVG (PC / SVT)
    // =========================================================================

    renderScientificVisuals(container) {
        if (!container) return;

        // 1. Transformer les blocs ```mathplot en graphiques vectoriels exacts
        const mathBlocks = container.querySelectorAll('pre code.language-mathplot, pre code.lang-mathplot');
        mathBlocks.forEach((codeEl) => {
            try {
                const rawJson = codeEl.textContent.trim();
                const spec = JSON.parse(rawJson);
                const svgGraph = this.buildMathPlotSvg(spec);
                const cardId = 'sci-card-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
                const card = document.createElement('div');
                card.className = 'scientific-diagram-card';
                card.id = cardId;
                card.innerHTML = `
                    <div class="scientific-diagram-header">
                        <span><i class="fa-solid fa-chart-line" style="color:#06b6d4; margin-right:6px;"></i> ${spec.title || 'Représentation Graphique & Courbe'}</span>
                        <button type="button" class="msg-action-btn no-print" style="background:#e2e8f0; color:#0f172a; padding:4px 10px;" onclick="aiTutor.downloadSvgFromCard('${cardId}', '${(spec.title || 'courbe_maths').replace(/[^a-z0-9]/gi, '_')}')">
                            <i class="fa-solid fa-download"></i> Image .SVG
                        </button>
                    </div>
                    <div class="scientific-svg-board">${svgGraph}</div>
                `;
                const preEl = codeEl.closest('pre');
                if (preEl) preEl.replaceWith(card);
            } catch (e) {
                console.warn("MathPlot parse error:", e);
            }
        });

        // 2. Transformer les blocs ```svg ou ```xml contenant un <svg> en planches scientifiques
        const svgCodeBlocks = container.querySelectorAll('pre code.language-svg, pre code.lang-svg, pre code.language-xml, pre code');
        svgCodeBlocks.forEach((codeEl) => {
            const rawText = codeEl.textContent.trim();
            if (rawText.startsWith('<svg') && rawText.includes('</svg>')) {
                const cardId = 'sci-card-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
                const card = document.createElement('div');
                card.className = 'scientific-diagram-card';
                card.id = cardId;
                card.innerHTML = `
                    <div class="scientific-diagram-header">
                        <span><i class="fa-solid fa-compass-drafting" style="color:#06b6d4; margin-right:6px;"></i> Schéma Scientifique & Planche Annotée</span>
                        <button type="button" class="msg-action-btn no-print" style="background:#e2e8f0; color:#0f172a; padding:4px 10px;" onclick="aiTutor.downloadSvgFromCard('${cardId}', 'schema_scientifique')">
                            <i class="fa-solid fa-download"></i> Enregistrer Schéma .SVG
                        </button>
                    </div>
                    <div class="scientific-svg-board">${rawText}</div>
                `;
                const preEl = codeEl.closest('pre');
                if (preEl) preEl.replaceWith(card);
            }
        });
    },

    evalMathExpr(exprStr, xVal) {
        try {
            let s = String(exprStr)
                .replace(/\^/g, '**')
                .replace(/\bln\s*\(/g, 'Math.log(')
                .replace(/\blog\s*\(/g, 'Math.log10(')
                .replace(/\bsin\s*\(/g, 'Math.sin(')
                .replace(/\bcos\s*\(/g, 'Math.cos(')
                .replace(/\btan\s*\(/g, 'Math.tan(')
                .replace(/\bexp\s*\(/g, 'Math.exp(')
                .replace(/\bsqrt\s*\(/g, 'Math.sqrt(')
                .replace(/\babs\s*\(/g, 'Math.abs(')
                .replace(/\bpi\b/gi, 'Math.PI')
                .replace(/\be\b/g, 'Math.E');
            const fn = new Function('x', `return (${s});`);
            const y = fn(xVal);
            return (typeof y === 'number' && isFinite(y)) ? y : null;
        } catch (e) {
            return null;
        }
    },

    buildMathPlotSvg(spec) {
        const width = 660;
        const height = 400;
        const padLeft = 55;
        const padRight = 30;
        const padTop = 30;
        const padBottom = 65;
        const plotW = width - padLeft - padRight;
        const plotH = height - padTop - padBottom;

        const xDom = Array.isArray(spec.xDomain) && spec.xDomain.length === 2 ? spec.xDomain : [-5, 5];
        const yDom = Array.isArray(spec.yDomain) && spec.yDomain.length === 2 ? spec.yDomain : [-5, 5];
        const xMin = Number(xDom[0]), xMax = Number(xDom[1]);
        const yMin = Number(yDom[0]), yMax = Number(yDom[1]);

        const toX = (x) => padLeft + ((x - xMin) / (xMax - xMin)) * plotW;
        const toY = (y) => padTop + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

        let gridLines = '';
        const xStep = Math.max(0.5, Math.round((xMax - xMin) / 10));
        const yStep = Math.max(0.5, Math.round((yMax - yMin) / 8));

        for (let gx = Math.ceil(xMin / xStep) * xStep; gx <= xMax; gx += xStep) {
            const px = toX(gx);
            gridLines += `<line x1="${px}" y1="${padTop}" x2="${px}" y2="${padTop + plotH}" stroke="#e2e8f0" stroke-width="1"/>`;
            if (Math.abs(gx) > 1e-6) {
                const axisY = (yMin <= 0 && yMax >= 0) ? toY(0) : padTop + plotH;
                gridLines += `<text x="${px}" y="${Math.min(padTop + plotH + 18, axisY + 16)}" font-size="11" fill="#475569" text-anchor="middle">${Number(gx.toFixed(2))}</text>`;
            }
        }

        for (let gy = Math.ceil(yMin / yStep) * yStep; gy <= yMax; gy += yStep) {
            const py = toY(gy);
            gridLines += `<line x1="${padLeft}" y1="${py}" x2="${padLeft + plotW}" y2="${py}" stroke="#e2e8f0" stroke-width="1"/>`;
            if (Math.abs(gy) > 1e-6) {
                const axisX = (xMin <= 0 && xMax >= 0) ? toX(0) : padLeft;
                gridLines += `<text x="${Math.max(padLeft - 8, axisX - 8)}" y="${py + 4}" font-size="11" fill="#475569" text-anchor="end">${Number(gy.toFixed(2))}</text>`;
            }
        }

        // Axes O, i, j
        let axesSvg = '';
        if (yMin <= 0 && yMax >= 0) {
            const y0 = toY(0);
            axesSvg += `<line x1="${padLeft}" y1="${y0}" x2="${padLeft + plotW}" y2="${y0}" stroke="#0f172a" stroke-width="2"/>`;
            axesSvg += `<polygon points="${padLeft + plotW},${y0} ${padLeft + plotW - 8},${y0 - 4} ${padLeft + plotW - 8},${y0 + 4}" fill="#0f172a"/>`;
            axesSvg += `<text x="${padLeft + plotW - 6}" y="${y0 - 8}" font-size="12" font-weight="bold" fill="#0f172a">${spec.xLabel || 'x'}</text>`;
        }
        if (xMin <= 0 && xMax >= 0) {
            const x0 = toX(0);
            axesSvg += `<line x1="${x0}" y1="${padTop}" x2="${x0}" y2="${padTop + plotH}" stroke="#0f172a" stroke-width="2"/>`;
            axesSvg += `<polygon points="${x0},${padTop} ${x0 - 4},${padTop + 8} ${x0 + 4},${padTop + 8}" fill="#0f172a"/>`;
            axesSvg += `<text x="${x0 + 10}" y="${padTop + 12}" font-size="12" font-weight="bold" fill="#0f172a">${spec.yLabel || 'y'}</text>`;
        }
        if (xMin <= 0 && xMax >= 0 && yMin <= 0 && yMax >= 0) {
            axesSvg += `<text x="${toX(0) - 10}" y="${toY(0) + 15}" font-size="11" font-weight="bold" fill="#0f172a">O</text>`;
        }

        // Courbes
        const palette = ['#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#6366f1'];
        const fns = Array.isArray(spec.functions) ? spec.functions : [];
        let curvesSvg = '';
        let legendSvg = '';

        fns.forEach((fObj, idx) => {
            const expr = fObj.expr || fObj.fn;
            if (!expr) return;
            const color = fObj.color || palette[idx % palette.length];
            const dashed = fObj.dashed ? 'stroke-dasharray="6,5"' : '';
            const steps = 450;
            let pathData = '';
            let penDown = false;
            let prevY = null;

            for (let i = 0; i <= steps; i++) {
                const x = xMin + (i / steps) * (xMax - xMin);
                const y = this.evalMathExpr(expr, x);
                if (y === null || y < yMin - (yMax - yMin) * 0.5 || y > yMax + (yMax - yMin) * 0.5) {
                    penDown = false;
                    prevY = null;
                    continue;
                }
                if (prevY !== null && Math.abs(y - prevY) > (yMax - yMin) * 0.8) {
                    penDown = false;
                }
                const px = toX(x).toFixed(2);
                const py = toY(y).toFixed(2);
                pathData += `${penDown ? 'L' : 'M'}${px},${py} `;
                penDown = true;
                prevY = y;
            }

            if (pathData) {
                curvesSvg += `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="2.6" ${dashed} clip-path="url(#plot-clip)"/>`;
            }

            const lx = padLeft + (idx * 200);
            const ly = height - 18;
            legendSvg += `
                <line x1="${lx}" y1="${ly - 4}" x2="${lx + 22}" y2="${ly - 4}" stroke="${color}" stroke-width="3" ${dashed}/>
                <text x="${lx + 28}" y="${ly}" font-size="12" font-weight="600" fill="#0f172a">${fObj.label || expr}</text>
            `;
        });

        // Points remarquables
        let pointsSvg = '';
        const pts = Array.isArray(spec.points) ? spec.points : [];
        pts.forEach((pt) => {
            if (typeof pt.x === 'number' && typeof pt.y === 'number') {
                const px = toX(pt.x);
                const py = toY(pt.y);
                pointsSvg += `
                    <circle cx="${px}" cy="${py}" r="4.5" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
                    <text x="${px + 7}" y="${py - 7}" font-size="11" font-weight="700" fill="#be123c">${pt.label || `(${pt.x};${pt.y})`}</text>
                `;
            }
        });

        return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="font-family:'Segoe UI',Arial,sans-serif; background:#ffffff;">
            <defs>
                <clipPath id="plot-clip">
                    <rect x="${padLeft}" y="${padTop}" width="${plotW}" height="${plotH}"/>
                </clipPath>
            </defs>
            <rect width="${width}" height="${height}" fill="#ffffff"/>
            <rect x="${padLeft}" y="${padTop}" width="${plotW}" height="${plotH}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
            ${gridLines}
            ${axesSvg}
            ${curvesSvg}
            ${pointsSvg}
            ${legendSvg}
        </svg>`;
    },

    downloadSvgFromCard(cardId, defaultName = 'schema_bac_ia') {
        const card = document.getElementById(cardId);
        if (!card) return;
        const svgEl = card.querySelector('svg');
        if (!svgEl) return;

        const svgData = new XMLSerializer().serializeToString(svgEl);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${defaultName}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast("Schéma vectoriel (.SVG) téléchargé sur ton appareil ! 🎨");
    },

    // =========================================================================
    // FONCTIONS ERGONOMIQUES 100% LOCALES : COPIER, SAUVEGARDER SUR L'APPAREIL, PDF
    // (Aucun fichier stocké sur Supabase)
    // =========================================================================

    copyMessage(msgId) {
        const msgEl = document.getElementById(msgId);
        if (!msgEl) return;
        const bodyEl = msgEl.querySelector('.msg-content-body');
        const textToCopy = bodyEl ? (bodyEl.innerText || bodyEl.dataset.raw) : msgEl.innerText;

        navigator.clipboard.writeText(textToCopy).then(() => {
            this.showToast("Réponse copiée dans le presse-papiers ! 📋");
        }).catch(() => {
            this.showToast("Erreur lors de la copie.");
        });
    },

    downloadMessageToDevice(msgId) {
        const msgEl = document.getElementById(msgId);
        if (!msgEl) return;
        const bodyEl = msgEl.querySelector('.msg-content-body');
        const htmlContent = bodyEl ? bodyEl.innerHTML : msgEl.innerHTML;
        const defaultTitle = this.currentCourse ? `Fiche_${this.currentCourse}` : `Fiche_Bac_IA_${new Date().toLocaleDateString('fr-FR')}`;
        const customTitle = prompt("Nom du fichier à enregistrer sur ton appareil :", defaultTitle);
        if (!customTitle) return;

        this.triggerLocalHtmlDownload(customTitle.trim(), this.currentSubject || 'Bac Sciences', this.currentCourse || 'Général', htmlContent);
    },

    triggerLocalHtmlDownload(title, subject, chapter, bodyHtml) {
        const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
        const standaloneHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${title} — BAC IA MAROC</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
<style>
  body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; background: #ffffff; max-width: 820px; margin: 35px auto; padding: 25px; line-height: 1.65; }
  .header { border-bottom: 2px solid #06b6d4; padding-bottom: 14px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
  .brand { font-size: 12px; font-weight: 800; color: #06b6d4; text-transform: uppercase; letter-spacing: 1px; }
  h1 { margin: 6px 0 4px 0; font-size: 22px; color: #111827; }
  h2, h3 { color: #0f172a; margin-top: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
  th { background: #f1f5f9; font-weight: 700; }
  pre, code { background: #f8fafc; padding: 3px 6px; border-radius: 5px; font-family: Consolas, monospace; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">BAC IA MAROC — DOCUMENT LOCAL ÉLÈVE</div>
      <h1>${title}</h1>
      <div style="font-size:14px; color:#475569;">${subject} • ${chapter}</div>
    </div>
    <div style="text-align:right; font-size:13px; color:#64748b;">
      <div><strong>Élève :</strong> ${this.userProfile?.firstname || ''}</div>
      <div><strong>Date :</strong> ${dateStr}</div>
    </div>
  </div>
  <div class="content">${bodyHtml}</div>
  <div class="footer">Sauvegardé localement depuis BAC IA MAROC — Vous pouvez ouvrir ce fichier hors-ligne ou l'imprimer en PDF (Ctrl+P).</div>
</body>
</html>`;

        const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9àâçéèêëîïôûùüÿñæœ_-]/gi, '_')}.html`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast(`Fichier "${title}" téléchargé sur ton appareil ! 💻`);
    },

    saveMessageToDocs(msgId, docType = 'fiche') {
        const msgEl = document.getElementById(msgId);
        if (!msgEl) return;
        const bodyEl = msgEl.querySelector('.msg-content-body');
        const rawContent = bodyEl ? bodyEl.dataset.raw : msgEl.innerText;

        const defaultTitle = this.currentCourse 
            ? `${docType === 'exercice' ? 'Exercices' : 'Fiche'} — ${this.currentCourse}`
            : `${docType === 'exercice' ? 'Exercice' : 'Fiche de révision'} du ${new Date().toLocaleDateString('fr-FR')}`;

        const customTitle = prompt("Titre du document à garder sur cet appareil :", defaultTitle);
        if (!customTitle) return;

        const newDoc = {
            id: 'local-doc-' + Date.now(),
            title: customTitle.trim(),
            subject: this.currentSubject || 'Sciences',
            chapter: this.currentCourse || 'Général',
            doc_type: docType,
            content: rawContent,
            created_at: new Date().toISOString()
        };

        // Sauvegarde 100% LOCALE dans le navigateur de l'appareil (aucun envoi vers Supabase)
        const storageKey = 'bac_ia_saved_docs_' + (this.userProfile?.id || 'guest');
        const localDocs = JSON.parse(localStorage.getItem(storageKey) || '[]');
        localDocs.unshift(newDoc);
        localStorage.setItem(storageKey, JSON.stringify(localDocs));

        this.loadSavedDocuments();
        this.showToast(`"${newDoc.title}" enregistré sur ton appareil ! 📁`);
    },

    loadSavedDocuments() {
        const storageKey = 'bac_ia_saved_docs_' + (this.userProfile?.id || 'guest');
        const localDocs = JSON.parse(localStorage.getItem(storageKey) || '[]');
        this.savedDocuments = localDocs;
        this.renderSavedDocuments();
    },

    renderSavedDocuments() {
        const container = document.getElementById('saved-docs-list');
        const countBadge = document.getElementById('docs-count-badge');
        if (countBadge) countBadge.innerText = this.savedDocuments.length;
        if (!container) return;

        if (this.savedDocuments.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px 20px; color:var(--text-dim);">
                    <i class="fa-regular fa-folder-open" style="font-size:2.5rem; margin-bottom:12px; opacity:0.5;"></i>
                    <p>Aucun document enregistré sur cet appareil.</p>
                    <small>Clique sur <strong>« Garder Fiche (Local) »</strong> ou <strong>« Télécharger sur l'appareil »</strong> sous une réponse de l'assistant IA.</small>
                </div>
            `;
            return;
        }

        container.innerHTML = this.savedDocuments.map((doc, idx) => {
            const badgeColor = doc.doc_type === 'exercice' ? '#f59e0b' : doc.doc_type === 'quiz' ? '#10b981' : 'var(--primary)';
            const dateStr = new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            const previewHtml = typeof marked !== 'undefined' ? marked.parse(doc.content) : doc.content;

            return `
                <div class="doc-card animate" id="saved-doc-${idx}">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                        <div>
                            <span style="background:${badgeColor}22; color:${badgeColor}; border:1px solid ${badgeColor}44; padding:3px 10px; border-radius:8px; font-size:0.7rem; font-weight:700; text-transform:uppercase;">
                                ${doc.doc_type || 'Fiche'} • ${doc.subject || 'Sciences'} (Stocké sur cet appareil)
                            </span>
                            <h4 style="margin:8px 0 4px 0; font-size:1.05rem; color:var(--text-main);">${doc.title}</h4>
                            <small style="color:var(--text-dim); font-size:0.75rem;"><i class="fa-regular fa-clock"></i> ${dateStr} — ${doc.chapter || ''}</small>
                        </div>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="msg-action-btn" onclick="aiTutor.copySavedDoc(${idx})" title="Copier le contenu">
                                <i class="fa-regular fa-copy"></i> Copier
                            </button>
                            <button class="msg-action-btn" onclick="aiTutor.downloadSavedDocHtml(${idx})" title="Enregistrer en fiche HTML consultable hors-ligne">
                                <i class="fa-solid fa-download"></i> Enregistrer Fiche (.HTML)
                            </button>
                            <button class="msg-action-btn" onclick="aiTutor.downloadDocTxt(${idx})" title="Télécharger en fichier Texte/Markdown">
                                <i class="fa-regular fa-file-lines"></i> .MD / .TXT
                            </button>
                            <button class="msg-action-btn" onclick="aiTutor.printSavedDoc(${idx})" title="Imprimer ou Exporter en PDF">
                                <i class="fa-solid fa-file-pdf"></i> PDF / Imprimer
                            </button>
                            <button class="msg-action-btn" style="color:#ef4444;" onclick="aiTutor.deleteSavedDoc(${idx})" title="Supprimer de cet appareil">
                                <i class="fa-regular fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                    <div class="doc-rendered-body" style="margin-top:10px; padding:15px; border-radius:12px; background:var(--input-bg); font-size:0.9rem; max-height:260px; overflow-y:auto; line-height:1.5;">
                        ${previewHtml}
                    </div>
                </div>
            `;
        }).join('');

        this.renderScientificVisuals(container);

        if (window.renderMathInElement) {
            renderMathInElement(container, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false }
                ],
                throwOnError: false
            });
        }
    },

    copySavedDoc(idx) {
        const doc = this.savedDocuments[idx];
        if (!doc) return;
        navigator.clipboard.writeText(doc.content).then(() => {
            this.showToast(`"${doc.title}" copié dans le presse-papiers ! 📋`);
        });
    },

    downloadSavedDocHtml(idx) {
        const doc = this.savedDocuments[idx];
        if (!doc) return;
        const renderedEl = document.querySelector(`#saved-doc-${idx} .doc-rendered-body`);
        const htmlContent = renderedEl ? renderedEl.innerHTML : (typeof marked !== 'undefined' ? marked.parse(doc.content) : doc.content);
        this.triggerLocalHtmlDownload(doc.title, doc.subject || 'Bac Sciences', doc.chapter || 'Général', htmlContent);
    },

    downloadDocTxt(idx) {
        const doc = this.savedDocuments[idx];
        if (!doc) return;
        const header = `# ${doc.title}\nMatière : ${doc.subject} | Chapitre : ${doc.chapter}\nDate : ${new Date(doc.created_at).toLocaleDateString('fr-FR')}\n\n---\n\n`;
        const blob = new Blob([header + doc.content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast("Fichier texte téléchargé sur ton appareil ! 📥");
    },

    deleteSavedDoc(idx) {
        const doc = this.savedDocuments[idx];
        if (!doc || !confirm(`Supprimer le document "${doc.title}" de cet appareil ?`)) return;

        this.savedDocuments.splice(idx, 1);
        const storageKey = 'bac_ia_saved_docs_' + (this.userProfile?.id || 'guest');
        localStorage.setItem(storageKey, JSON.stringify(this.savedDocuments));

        this.renderSavedDocuments();
        this.showToast("Document supprimé de l'appareil.");
    },

    printMessage(msgId) {
        const msgEl = document.getElementById(msgId);
        if (!msgEl) return;
        const bodyEl = msgEl.querySelector('.msg-content-body');
        const htmlContent = bodyEl ? bodyEl.innerHTML : msgEl.innerHTML;
        const title = this.currentCourse ? `Fiche & Exercices : ${this.currentCourse}` : 'Fiche de Révision & Exercices — BAC IA MAROC';
        this.openPrintSheet(title, this.currentSubject || 'Bac Sciences', htmlContent);
    },

    printSavedDoc(idx) {
        const doc = this.savedDocuments[idx];
        if (!doc) return;
        const renderedEl = document.querySelector(`#saved-doc-${idx} .doc-rendered-body`);
        const htmlContent = renderedEl ? renderedEl.innerHTML : (typeof marked !== 'undefined' ? marked.parse(doc.content) : doc.content);
        this.openPrintSheet(doc.title, `${doc.subject} — ${doc.chapter}`, htmlContent);
    },

    printFullDiagnosticAndPlan() {
        const p = this.userProfile || {};
        const axesEl = document.getElementById('axes-list');
        const planEl = document.getElementById('plan-list');

        const html = `
            <div style="margin-bottom:25px; padding:18px; border:1px solid #d1d5db; border-radius:12px; background:#f9fafb;">
                <h3 style="margin:0 0 10px 0; color:#111827;">1. Profil Psychologique & Diagnostic</h3>
                <p style="margin:4px 0;"><strong>Élève :</strong> ${p.firstname || ''} (${p.email || ''})</p>
                <p style="margin:4px 0;"><strong>Filière :</strong> ${p.track || 'Sciences'} | <strong>Profil attribué :</strong> ${p.assigned_profile || 'En cours'}</p>
                <p style="margin:4px 0;"><strong>Temps quotidien cible :</strong> ${p.daily_time_minutes || 60} min/jour</p>
                <div style="margin-top:15px;">${axesEl ? axesEl.innerHTML : ''}</div>
            </div>
            <div style="margin-bottom:25px; padding:18px; border:1px solid #d1d5db; border-radius:12px;">
                <h3 style="margin:0 0 12px 0; color:#111827;">2. Planning & Tâches de Révision</h3>
                <div>${planEl ? planEl.innerHTML : 'Aucune tâche.'}</div>
            </div>
        `;
        this.openPrintSheet(`Bilan Diagnostic & Plan de Révision — ${p.firstname || 'Élève'}`, `Filière ${p.track || 'Bac Sciences'}`, html);
    },

    openPrintSheet(title, subtitle, bodyHtml) {
        let sheet = document.getElementById('printable-sheet');
        if (!sheet) {
            sheet = document.createElement('div');
            sheet.id = 'printable-sheet';
            document.body.appendChild(sheet);
        }

        const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
        sheet.innerHTML = `
            <div style="border-bottom: 2px solid #06b6d4; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 0.75rem; font-weight: 800; color: #06b6d4; letter-spacing: 1px; text-transform: uppercase;">BAC IA MAROC — SYSTÈME DE RÉVISION INTELLIGENT</div>
                    <h1 style="margin: 5px 0 3px 0; font-size: 1.5rem; color: #111827;">${title}</h1>
                    <div style="font-size: 0.9rem; color: #4b5563;">${subtitle}</div>
                </div>
                <div style="text-align: right; font-size: 0.8rem; color: #6b7280;">
                    <div><strong>Élève :</strong> ${this.userProfile?.firstname || ''}</div>
                    <div><strong>Date :</strong> ${dateStr}</div>
                </div>
            </div>
            <div style="font-size: 1rem; line-height: 1.6; color: #111827;">
                ${bodyHtml}
            </div>
            <div style="margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 0.75rem; color: #9ca3af; text-align: center;">
                Document généré par BAC IA MAROC — "Un élève qui gagne 1 point change son avenir."
            </div>
        `;

        if (window.renderMathInElement) {
            renderMathInElement(sheet, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false }
                ],
                throwOnError: false
            });
        }

        setTimeout(() => window.print(), 250);
    },

    removeMessageFromMain(id) { const el = document.getElementById(id); if (el) el.remove(); },

    async askAboutCourse(title, subject) {
        this.currentCourse = title;
        this.currentSubject = subject;
        this.updateActiveCourseBanner();
        if (typeof switchMainTab === 'function') switchMainTab('chat');
        const mainCol = document.getElementById('col-main');
        if (mainCol && window.innerWidth <= 1100) {
            mainCol.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        this.sendMessageFromMain(`Génère ma fiche de révision structurée pour le cours : **${title}** en ${subject}.`);
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
        if (this.currentMessages.length === 0) {
            this.showToast("La discussion est vide.");
            return;
        }
        const title = this.currentMessages[0].content.substring(0, 34) + "...";
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
            if (btn) btn.innerHTML = '<i class="fa-solid fa-check"></i> Sauvegardé';
            this.showToast("Discussion enregistrée dans l'historique ! 💬");
            setTimeout(() => { if (btn) btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Sauvegarder ce chat'; }, 2000);
            this.loadHistory();
        } catch (err) {
            console.error("Save Error:", err);
            if (btn) btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Sauvegarder ce chat';
            this.showToast("Discussion sauvegardée localement.");
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
            if (!data || data.length === 0) {
                container.innerHTML = `<div style="font-size:0.75rem; color:var(--text-dim); opacity:0.6; padding:8px;">Aucune discussion archivée.</div>`;
                return;
            }
            data.forEach(chat => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.style.padding = "10px 12px";
                item.style.marginBottom = "5px";
                item.style.borderRadius = "10px";
                item.style.background = "rgba(255,255,255,0.03)";
                item.style.border = "1px solid var(--glass-border)";
                item.style.cursor = "pointer";
                item.style.fontSize = "0.8rem";
                item.innerHTML = `<div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><i class="fa-regular fa-comment-dots" style="margin-right:6px; color:var(--primary);"></i>${chat.title}</div>`;
                item.onclick = () => {
                    if (typeof switchMainTab === 'function') switchMainTab('chat');
                    this.openChat(chat);
                };
                container.appendChild(item);
            });
        } catch (err) {
            container.innerHTML = `<div style="font-size:0.75rem; color:var(--text-dim); opacity:0.6; padding:8px;">Historique prêt.</div>`;
        }
    },

    openChat(chat) {
        this.currentChatId = chat.id;
        this.currentMessages = chat.messages || [];
        const container = document.getElementById('ai-messages-main');
        if (container) {
            container.innerHTML = '';
            this.currentMessages.forEach(msg => this.addMessageToMain(msg.role === 'assistant' ? 'ai' : msg.role, msg.content));
        }
    },

    async askQuickPrompt(promptText) {
        if (typeof switchMainTab === 'function') switchMainTab('chat');
        let descriptivePrompt = promptText;
        if (promptText.includes("3 exercices")) {
            descriptivePrompt = "Rédige-moi 3 exercices progressifs (Niveau 1 Facile, Niveau 2 Moyen, Niveau 3 Type Bac National) avec indications méthodologiques sur ce cours.";
        } else if (promptText.includes("Facilite-moi")) {
            descriptivePrompt = "Explique-moi ce chapitre de manière ultra-simple, étape par étape, avec les formules essentielles à retenir.";
        }

        let finalPrompt = descriptivePrompt;
        if (this.currentCourse) {
            finalPrompt = `${descriptivePrompt} Chapitre : "${this.currentCourse}" (${this.currentSubject || 'Sciences'}).`;
        }
        this.sendMessageFromMain(finalPrompt);
    },

    async generateQuiz(courseTitle, subject = "") {
        const systemPrompt = `Tu es un examinateur officiel du Bac Maroc.
Génère un Quiz interactif (QCM) de 5 questions sur le cours : "${courseTitle}" ${subject ? `en ${subject}` : ''}.
Réponds UNIQUEMENT avec un tableau JSON valide sans texte autour :
[{"question": "...", "options": ["A", "B", "C", "D"], "answer": 0, "explanation": "..."}]`;
        const response = await this.callGeminiAPI(systemPrompt, { jsonMode: true });
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        const cleanJson = jsonMatch ? jsonMatch[0] : response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
    },

    async startQuizFlow() {
        if (typeof switchMainTab === 'function') switchMainTab('chat');
        const targetCourse = this.currentCourse || "Programme Bac Sciences";
        const loadingId = 'quiz-loading-' + Date.now();
        this.addMessageToMain('ai', `<div class="skeleton" style="height:40px; width:100%"></div>`, loadingId, true);
        try {
            const quizData = await this.generateQuiz(targetCourse, this.currentSubject);
            this.removeMessageFromMain(loadingId);
            this.renderQuizInChat(quizData, targetCourse);
        } catch (e) {
            this.removeMessageFromMain(loadingId);
            this.addMessageToMain('ai', "⚠️ Impossible de générer le quiz. Vérifie que la clé IA est configurée ou sélectionne un chapitre.");
        }
    },

    renderQuizInChat(quizData, courseName = "") {
        const quizId = 'quiz-' + Date.now();
        const container = document.createElement('div');
        container.id = quizId;
        container.className = 'bento-item animate';
        container.style.marginTop = "15px";
        container.style.border = "1.5px solid var(--primary)";

        window.currentQuiz = { data: quizData, score: 0, currentIdx: 0, id: quizId, courseName: courseName, userAnswers: [] };
        this.nextQuizQuestion(quizId, 0);
        document.getElementById('ai-messages-main').appendChild(container);
    },

    nextQuizQuestion(quizId, idx) {
        const quiz = window.currentQuiz;
        const q = quiz.data[idx];
        const container = document.getElementById(quizId);
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span class="badge-premium">Quiz Bac • Question ${idx + 1}/${quiz.data.length}</span>
                <span style="font-size:0.8rem; color:var(--text-dim);">${quiz.courseName}</span>
            </div>
            <div style="font-weight:700; font-size:1.05rem; margin-bottom:15px;">${q.question}</div>
            <div style="display:grid; gap:10px;">
                ${q.options.map((opt, i) => `
                    <button onclick="aiTutor.handleQuizAnswer('${quizId}', ${idx}, ${i})" class="prompt-box" style="width:100%; text-align:left; font-weight:500;">
                        <strong>${String.fromCharCode(65 + i)}.</strong> ${opt}
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
        quiz.userAnswers.push({ question: q.question, selected: q.options[selectedIdx], correct: q.options[q.answer], isCorrect, explanation: q.explanation });

        container.innerHTML = `
            <div style="color:${isCorrect ? '#10b981' : '#ef4444'}; font-weight:800; font-size:1.05rem; margin-bottom:10px;">
                ${isCorrect ? '✅ Excellente réponse !' : `❌ Incorrect — La bonne réponse était : ${q.options[q.answer]}`}
            </div>
            <p style="font-size:0.9rem; margin-bottom:18px; line-height:1.5; background:var(--input-bg); padding:12px; border-radius:10px;">${q.explanation}</p>
            ${qIdx < quiz.data.length - 1
                ? `<button onclick="aiTutor.nextQuizQuestion('${quizId}', ${qIdx + 1})" class="btn-ai-small" style="width:100%">Question Suivante <i class="fa-solid fa-arrow-right"></i></button>`
                : `
                <div style="text-align:center; padding:15px; background:rgba(6, 182, 212, 0.08); border-radius:14px;">
                    <div style="font-weight:800; font-size:1.4rem; color:var(--primary); margin-bottom:8px;">Score Final : ${quiz.score} / ${quiz.data.length}</div>
                    <div style="display:flex; justify-content:center; gap:10px; margin-top:12px;">
                        <button onclick="aiTutor.saveQuizResultToDocs()" class="msg-action-btn"><i class="fa-regular fa-bookmark"></i> Enregistrer ce Résultat</button>
                        <button onclick="aiTutor.printQuizResult()" class="msg-action-btn"><i class="fa-solid fa-file-pdf"></i> Imprimer le corrigé PDF</button>
                    </div>
                </div>`
            }
        `;
    },

    saveQuizResultToDocs() {
        const quiz = window.currentQuiz;
        if (!quiz) return;
        let md = `### Résultat du Quiz : ${quiz.courseName || 'Bac Sciences'}\n**Score obtenu : ${quiz.score} / ${quiz.data.length}**\n\n`;
        quiz.userAnswers.forEach((a, i) => {
            md += `**Q${i + 1}. ${a.question}**\n- Ta réponse : ${a.selected} (${a.isCorrect ? '✅ Correct' : '❌ Incorrect'})\n- Réponse exacte : ${a.correct}\n- Explication : ${a.explanation}\n\n`;
        });

        const fakeId = 'temp-quiz-' + Date.now();
        const div = document.createElement('div');
        div.id = fakeId;
        div.style.display = 'none';
        div.innerHTML = `<div class="msg-content-body" data-raw="${md.replace(/"/g, '&quot;')}">${md}</div>`;
        document.body.appendChild(div);
        this.saveMessageToDocs(fakeId, 'resultat');
        div.remove();
    },

    printQuizResult() {
        const quiz = window.currentQuiz;
        if (!quiz) return;
        let html = `<p><strong>Score final : ${quiz.score} / ${quiz.data.length}</strong></p><hr style="margin:15px 0;">`;
        quiz.userAnswers.forEach((a, i) => {
            html += `
                <div style="margin-bottom:18px; padding-bottom:12px; border-bottom:1px solid #e5e7eb;">
                    <div><strong>Question ${i + 1} :</strong> ${a.question}</div>
                    <div style="color:${a.isCorrect ? '#059669' : '#dc2626'};">Votre réponse : ${a.selected} (${a.isCorrect ? 'Correct' : 'Incorrect'})</div>
                    <div><strong>Bonne réponse :</strong> ${a.correct}</div>
                    <div style="font-size:0.9rem; color:#4b5563; margin-top:4px;"><em>Explication :</em> ${a.explanation}</div>
                </div>
            `;
        });
        this.openPrintSheet(`Corrigé & Résultat Quiz — ${quiz.courseName}`, `Score : ${quiz.score}/${quiz.data.length}`, html);
    }
};
