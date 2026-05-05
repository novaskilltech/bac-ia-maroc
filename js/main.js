document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');
    const authSwitch = document.getElementById('auth-switch');
    const modalTitle = document.getElementById('modal-title');

    let isLogin = false;

    // Toggle Modal
    startBtn.addEventListener('click', (e) => {
        e.preventDefault();
        authModal.style.display = 'flex';
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
            document.getElementById('lang').parentElement.style.display = 'none';
            document.getElementById('firstname').removeAttribute('required');
            document.getElementById('whatsapp').removeAttribute('required');
            // Show password for login
            document.getElementById('password-group').style.display = 'block';
            document.getElementById('password').setAttribute('required', 'required');
        } else {
            modalTitle.innerText = 'Créer ton compte';
            authForm.querySelector('button').innerText = 'Suivant';
            authSwitch.innerText = 'Déjà inscrit ? Connecte-toi ici.';
            // Show signup-only fields
            document.getElementById('firstname').parentElement.style.display = 'block';
            document.getElementById('whatsapp').parentElement.style.display = 'block';
            document.getElementById('lang').parentElement.style.display = 'block';
            document.getElementById('firstname').setAttribute('required', 'required');
            document.getElementById('whatsapp').setAttribute('required', 'required');
            // Hide password for signup
            document.getElementById('password-group').style.display = 'none';
            document.getElementById('password').removeAttribute('required');
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
