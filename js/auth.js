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
                if (data?.user) {
                    this.user = data.user;
                    await this.fetchProfile();
                    this.handleUserReady();
                    return;
                }
            } else {
                // Inscription Supabase Auth réelle
                const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            firstname: firstname,
                            whatsapp: whatsapp,
                            grade_level: gradeLevel,
                            track: track,
                            lang: lang
                        }
                    }
                });

                if (authError) throw authError;

                if (authData?.user) {
                    this.user = authData.user;
                    
                    // Upsert profil élève
                    const userProfile = {
                        id: this.user.id,
                        email: email,
                        firstname: firstname,
                        whatsapp: whatsapp,
                        grade_level: gradeLevel,
                        track: track,
                        lang: lang,
                        status: 'en_attente',
                        payment_status: 'non_paye',
                        quiz_completed: false
                    };

                    const { data: pData, error: pError } = await supabaseClient
                        .from('profiles')
                        .upsert([userProfile])
                        .select()
                        .single();

                    this.profile = pData || userProfile;
                    this.handleUserReady();
                } else {
                    alert("Compte créé ! Veuillez vérifier votre boîte email pour valider votre inscription si une confirmation est requise.");
                }
            }
        } catch (error) {
            // Si le compte a déjà été créé ou si Supabase bloque sur l'envoi d'email de confirmation
            if (!isLogin && (error.message.includes('rate limit') || error.message.includes('already registered'))) {
                try {
                    const { data: logData, error: logError } = await supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: password
                    });
                    if (!logError && logData?.user) {
                        this.user = logData.user;
                        await this.fetchProfile();
                        this.handleUserReady();
                        return;
                    }
                } catch(e) {
                    console.warn("Auto-login failed:", e);
                }
            }

            alert('Erreur: ' + error.message);
            submitBtn.disabled = false;
            submitBtn.innerText = isLogin ? 'Se connecter' : 'Créer mon compte';
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
        
        // 1. Si rôle admin -> aller directement sur admin.html ou laisser choisir
        if (this.profile.role === 'admin') {
            window.location.href = 'admin.html';
            return;
        }

        // 2. Si l'élève n'a pas encore complété son diagnostic -> afficher le questionnaire
        if (!this.profile.quiz_completed) {
            this.questionnaireSection.style.display = 'block';
            if (typeof questionnaire !== 'undefined') {
                questionnaire.init();
            }
            return;
        }

        // 3. Si le diagnostic est complété mais le compte est en attente -> afficher la page paiement
        if (this.profile.status !== 'valide') {
            const paymentSection = document.getElementById('payment');
            if (paymentSection) {
                paymentSection.style.display = 'block';
                
                // Personnaliser le message WhatsApp avec les infos de l'élève
                const waBtn = paymentSection.querySelector('a[href*="wa.me"]');
                if (waBtn) {
                    const refMsg = `Bonjour, voici ma preuve de paiement (199 DH) pour BAC IA MAROC.\n\n*Élève* : ${this.profile.firstname || ''}\n*Email* : ${this.profile.email || ''}\n*Tél/WhatsApp* : ${this.profile.whatsapp || ''}\n*Filière* : ${this.profile.track || 'Sciences'}`;
                    waBtn.href = `https://wa.me/212716014148?text=${encodeURIComponent(refMsg)}`;
                }

                // Personnaliser le lien Stripe avec client_reference_id = profile.id
                const stripeBtn = document.getElementById('stripe-pay-btn');
                if (stripeBtn) {
                    const baseStripeUrl = 'https://buy.stripe.com/00w3cv6ci5kz5Jx5uKgbm0w';
                    const emailParam = this.profile.email ? `&prefilled_email=${encodeURIComponent(this.profile.email)}` : '';
                    stripeBtn.href = `${baseStripeUrl}?client_reference_id=${encodeURIComponent(this.profile.id)}${emailParam}`;
                }

                // Scroll automatique vers la section de paiement pour une visibilité immédiate
                paymentSection.scrollIntoView({ behavior: 'smooth' });

                // Écoute en direct (Realtime) du déblocage dès paiement Stripe
                if (!this.realtimeSubscribed) {
                    this.realtimeSubscribed = true;
                    supabaseClient
                        .channel('public:profiles:' + this.profile.id)
                        .on('postgres_changes', { 
                            event: 'UPDATE', 
                            schema: 'public', 
                            table: 'profiles', 
                            filter: `id=eq.${this.profile.id}` 
                        }, (payload) => {
                            if (payload.new && payload.new.status === 'valide') {
                                this.profile = payload.new;
                                alert("🎉 Félicitations ! Ton paiement de 199 DH est validé. Ton accès complet est ouvert !");
                                window.location.href = 'diagnostic.html';
                            }
                        })
                        .subscribe();
                }
            }
            return;
        }

        // 4. Si validé et quiz complété -> vers le dashboard
        window.location.href = 'diagnostic.html';
    }
};

window.auth = auth;
document.addEventListener('DOMContentLoaded', () => auth.init());
