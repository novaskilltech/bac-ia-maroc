document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');
    const authSwitch = document.getElementById('auth-switch');
    const modalTitle = document.getElementById('modal-title');

    let isLogin = false;

    function openModalMode(loginMode = false) {
        authModal.style.display = 'flex';
        if (loginMode !== isLogin) {
            authSwitch.click();
        }
    }

    // Toggle Modal on main start-btn and all .open-auth-btn CTAs
    if (startBtn) {
        startBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModalMode(false);
        });
    }

    document.querySelectorAll('.open-auth-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openModalMode(false);
        });
    });

    document.querySelectorAll('.open-login-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openModalMode(true);
        });
    });

    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.style.display = 'none';
        }
    });

    // Switch between Login/Signup
    authSwitch.addEventListener('click', () => {
        isLogin = !isLogin;
        if (isLogin) {
            modalTitle.innerText = 'Connexion';
            authForm.querySelector('button').innerText = 'Se connecter';
            authSwitch.innerText = 'Pas encore de compte ? Inscris-toi.';
            // Hide signup-only fields
            document.getElementById('firstname').parentElement.style.display = 'none';
            document.getElementById('whatsapp').parentElement.style.display = 'none';
            document.getElementById('grade_level').parentElement.style.display = 'none';
            document.getElementById('track').parentElement.style.display = 'none';
            document.getElementById('lang').parentElement.style.display = 'none';
            document.getElementById('firstname').removeAttribute('required');
            document.getElementById('whatsapp').removeAttribute('required');
            document.getElementById('password-group').style.display = 'block';
            document.getElementById('password').setAttribute('required', 'required');
        } else {
            modalTitle.innerText = 'Créer ton compte';
            authForm.querySelector('button').innerText = 'Créer mon compte';
            authSwitch.innerText = 'Déjà inscrit ? Connecte-toi ici.';
            // Show signup-only fields
            document.getElementById('firstname').parentElement.style.display = 'block';
            document.getElementById('whatsapp').parentElement.style.display = 'block';
            document.getElementById('grade_level').parentElement.style.display = 'block';
            document.getElementById('track').parentElement.style.display = 'block';
            document.getElementById('lang').parentElement.style.display = 'block';
            document.getElementById('firstname').setAttribute('required', 'required');
            document.getElementById('whatsapp').setAttribute('required', 'required');
            document.getElementById('password-group').style.display = 'block';
            document.getElementById('password').setAttribute('required', 'required');
        }
    });

    // Feature card entrance animation
    const cards = document.querySelectorAll('.card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, { threshold: 0.1 });

    cards.forEach(card => observer.observe(card));
});
