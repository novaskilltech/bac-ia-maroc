# BAC IA MAROC 🎓🤖

**BAC IA MAROC** est une plateforme web "Mobile-First" conçue pour accompagner les lycéens marocains dans leurs révisions du Baccalauréat. Grâce à un diagnostic ciblé, la plateforme génère un profil psychologique d'apprentissage et propose un plan de révision de 30 jours, accompagné de requêtes IA (prompts) personnalisées.

## 🚀 Fonctionnalités Clés

- **Authentification Hybride** : Connexion classique, authentification Google, ou inscription manuelle sécurisée.
- **Workflow de Paiement Manuel** : Les utilisateurs s'inscrivent et sont redirigés vers WhatsApp pour validation manuelle du paiement (199 DH), garantissant simplicité et sécurité pour la version MVP.
- **Diagnostic IA interactif** : Un questionnaire en 5 étapes pour identifier le profil de l'élève.
- **Plan de 30 Jours Dynamique** : Génération automatique d'un programme complet adapté au profil (P1).
- **Tableau de Bord Premium** : Interface enrichie avec visuels IA et ressources YouTube recommandées (P1).
- **Export PDF Professionnel** : Bouton d'export optimisé pour l'impression du plan de révision (P1).
- **Dashboard Admin Avancé** : Recherche instantanée et gestion simplifiée des élèves, avec **Analytics Dashboard** intégré (Revenus, Statistiques de profils) (P1/P2).

## 🛠 Stack Technique

- **Frontend** : HTML5, CSS3 (Vanilla avec variables CSS pour le design), JavaScript (ES6+).
- **Backend & Base de données** : [Supabase](https://supabase.com/) (PostgreSQL).
- **Sécurité** : Row Level Security (RLS) appliqué en base de données, protection des routes côté client, système d'Autorisation (rôles Admin/User).

## 📂 Structure du Projet

```text
├── index.html              # Page d'accueil et authentification
├── admin.html              # Tableau de bord administrateur
├── diagnostic.html         # Tableau de bord élève (protégé)
├── css/
│   └── style.css           # Feuille de style principale (Design UI)
└── js/
    ├── auth.js             # Logique d'authentification et routage
    ├── main.js             # Gestion du DOM, animations, et interface
    ├── questionnaire.js    # Logique du diagnostic et calcul du profil
    └── supabase-config.js  # Configuration client Supabase
```

## 🔒 Configuration de Sécurité (Supabase RLS)

Pour que la plateforme fonctionne correctement, les politiques de sécurité (Row Level Security) suivantes doivent être actives sur la table `profiles` :

1. Autoriser les utilisateurs à créer leur profil à la première connexion :
   ```sql
   CREATE POLICY "Les utilisateurs peuvent créer leur profil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
   ```
2. Autoriser la lecture de son propre profil :
   ```sql
   CREATE POLICY "Les utilisateurs peuvent voir leur profil" ON public.profiles FOR SELECT USING (auth.uid() = id);
   ```
3. Donner un accès VIP total à l'administrateur :
   ```sql
   CREATE POLICY "Les admins peuvent voir tous les profils" ON public.profiles FOR SELECT USING (auth.jwt()->>'email' = 'VOTRE_EMAIL_ADMIN');
   CREATE POLICY "Les admins peuvent modifier tous les profils" ON public.profiles FOR UPDATE USING (auth.jwt()->>'email' = 'VOTRE_EMAIL_ADMIN');
   ```

## 💻 Installation & Déploiement Local

1. Clonez ce dépôt.
2. Lancez un serveur local à la racine du projet (ex: via Python) :
   ```bash
   python -m http.server 3000
   ```
3. Ouvrez votre navigateur sur `http://localhost:3000`.

---
*Développé avec la philosophie "Code Propre & Sécurité Avant Tout" par l'équipe NOVA RESCUE.*
