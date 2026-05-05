const auth = {
    user: null,
    profile: null,

    async init() {
        this.authForm = document.getElementById('auth-form');
        this.authModal = document.getElementById('auth-modal');
        this.landingSection = document.getElementById('landing');
        this.featuresSection = document.getElementById('features');
        this.questionnaireSection = document.getElementById('questionnaire');
        
        
        this.authForm.addEventListener('submit', (e) => this.handleSubmit(e));
        
        const googleBtn = document.getElementById('google-auth-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => this.handleGoogleAuth());
        }
        
        // Check current session
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            this.user = session.user;
            await this.fetchProfile();
            this.handleUserReady();
        }

        // Listen for auth state changes
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                this.user = session.user;
                await this.fetchProfile();
                this.handleUserReady();
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                this.profile = null;
                window.location.reload();
            }
        });
    },

    async fetchProfile() {
        if (!this.user) return;
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', this.user.id)
            .single();
            
        if (data) {
            this.profile = data;
        } else if (error && error.code === 'PGRST116') {
            // Profil introuvable (ex: 1ere connexion via Google), on le crée
            const newProfile = {
                id: this.user.id,
                email: this.user.email,
                firstname: this.user.user_metadata?.full_name || this.user.user_metadata?.name || '',
                status: 'en_attente'
            };
            
            const { data: createdProfile, error: insertError } = await supabaseClient
                .from('profiles')
                .insert([newProfile])
                .select()
                .single();
                
            if (createdProfile) {
                this.profile = createdProfile;
            } else {
                console.error('Error creating profile:', insertError);
                // Si l'insert échoue à cause du RLS, on simule un profil temporaire pour ne pas bloquer l'UX
                this.profile = newProfile;
            }
        } else if (error) {
            console.error('Error fetching profile:', error);
        }
    },

    async handleSubmit(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const firstname = document.getElementById('firstname').value;
        const whatsapp = document.getElementById('whatsapp').value;
        const lang = document.getElementById('lang').value;

        const gradeLevel = document.getElementById('grade_level').value;
        const track = document.getElementById('track').value;

        const isLogin = document.getElementById('modal-title').innerText === 'Connexion';
        
        // Disable button to prevent double submission
        const submitBtn = this.authForm.querySelector('button');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Patientez...';

        try {
            if (isLogin) {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });
                if (error) throw error;
                // session change listener will handle the rest
            } else {
                // Manual SignUp flow via WhatsApp
                const message = `Bonjour, je souhaite m'inscrire à BAC IA MAROC.\n\n*Prénom* : ${firstname}\n*WhatsApp* : ${whatsapp}\n*Email* : ${email}\n*Niveau* : ${gradeLevel}\n*Filière* : ${track}\n*Langue* : ${lang}\n\n(Veuillez ajouter votre reçu de paiement de 199 DH à ce message)`;
                
                const waLink = `https://wa.me/212716014148?text=${encodeURIComponent(message)}`;
                
                alert("Votre demande d'inscription a été préparée ! Vous allez être redirigé vers WhatsApp pour l'envoyer avec votre reçu de paiement à l'administrateur.");
                
                window.location.href = waLink;
                
                submitBtn.disabled = false;
                submitBtn.innerText = 'Suivant';
            }
        } catch (error) {
            alert('Erreur: ' + error.message);
            submitBtn.disabled = false;
            submitBtn.innerText = isLogin ? 'Se connecter' : 'Suivant';
        }
    },

    async handleGoogleAuth() {
        try {
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                redirectTo: `${window.location.origin}/`
                }
            });
            if (error) throw error;
        } catch (error) {
            alert('Erreur Google Auth: ' + error.message);
        }
    },

    handleUserReady() {
        if (!this.profile) return;
        
        this.authModal.style.display = 'none';
        this.landingSection.style.display = 'none';
        this.featuresSection.style.display = 'none';
        
        if (this.profile.status === 'valide' || this.profile.role === 'admin') {
            // Si c'est un admin ou qu'il a déjà fait le quiz, on l'envoie au diagnostic
            if (!this.profile.quiz_completed && this.profile.role !== 'admin') {
                this.questionnaireSection.style.display = 'block';
                if (typeof quiz !== 'undefined') quiz.init();
            } else {
                window.location.href = 'diagnostic.html';
            }
        } else {
            document.getElementById('payment').style.display = 'block';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => auth.init());
