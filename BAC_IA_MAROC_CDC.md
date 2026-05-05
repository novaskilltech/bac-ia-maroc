# ✅ NOVA CDC — CDC COMPLET FINAL

## BAC IA MAROC — Diagnostic + App de révision

Version : **v1.1 Final — prête NovaSquad**

Ce CDC consolide le brief initial, tes décisions produit, et la dernière modification : **authentification obligatoire + validation manuelle des comptes par admin**. Format aligné avec la méthode NOVA CDC : cadrage MVP, P0/P1/P2, règles métier, risques, sécurité, RGPD, critères d’acceptation et handoff NovaSquad. 

---

# 1. Résumé du projet

**BAC IA Maroc** est une application web mobile-first destinée aux élèves marocains de **2e année Bac Sciences**.

Le produit permet à l’élève de :

* créer un compte,
* remplir un questionnaire de diagnostic,
* payer **199 DH** via CashPlus / WafaCash / équivalent,
* attendre la validation manuelle de son compte par l’admin,
* accéder à un diagnostic personnalisé,
* consulter un plan de révision,
* utiliser une app simple avec méthode, routines et prompts IA adaptés.

---

# 2. Objectif business

Valider rapidement une offre payante autour de la préparation au bac marocain.

Objectifs :

* vendre un accès diagnostic + app à **199 DH**,
* collecter des leads WhatsApp qualifiés,
* tester l’intérêt des élèves Bac Sciences,
* contrôler manuellement les accès,
* préparer ensuite une offre plus complète à **199 DH** ou un coaching premium.

---

# 3. Cible utilisateur

## Cible P0

Élèves marocains de **2e année Bac Sciences**.

## Cible secondaire

Parents cherchant une solution simple, abordable et sérieuse pour aider leur enfant à mieux réviser.

## Hors cible P0

* filière économie,
* filière lettres,
* collège,
* tronc commun,
* enseignants,
* établissements scolaires.

Ces segments peuvent être ajoutés plus tard.

---

# 4. Problème à résoudre

Beaucoup d’élèves préparent le bac sans vraie méthode :

* ils ne savent pas quoi réviser en priorité,
* ils relisent trop sans pratiquer,
* ils manquent d’organisation,
* ils stressent,
* ils utilisent mal l’IA,
* ils ne savent pas analyser leurs erreurs,
* ils perdent des points évitables.

---

# 5. Proposition de valeur

> **Un diagnostic intelligent pour comprendre ton profil, corriger ta méthode et gagner des points au bac.**

Phrase clé :

> **“Un élève qui gagne 1 point change son avenir.”**

---

# 6. Positionnement

BAC IA Maroc n’est pas :

* une simple app IA,
* un cours classique,
* une promesse magique de réussite,
* un remplacement de l’école.

BAC IA Maroc est :

> **un système de révision intelligent, personnalisé et guidé.**

---

# 7. Offre MVP

## Offre principale P0

**Diagnostic personnalisé + accès app simple : 199 DH**

L’offre contient :

* diagnostic élève,
* profil de révision,
* problème principal,
* stratégie recommandée,
* plan de révision 30 jours,
* routine quotidienne,
* prompts IA adaptés,
* accès app après validation admin.

---

# 8. Décisions structurantes

| Sujet             | Décision finale                  |
| ----------------- | -------------------------------- |
| Plateforme        | Web mobile-first                 |
| Filière P0        | Sciences uniquement              |
| Langues           | Français + arabe                 |
| Prix MVP          | 199 DH                            |
| Paiement          | CashPlus / WafaCash / équivalent |
| Authentification  | Obligatoire                      |
| Validation compte | Manuelle par admin               |
| Accès résultat    | Bloqué avant validation          |
| IA P0             | Templates contrôlés + variables  |
| App native        | Hors scope P0                    |
| Paiement carte    | Hors scope P0                    |

---

# 9. MVP retenu

Le MVP contient :

1. landing page,
2. création compte élève,
3. connexion élève,
4. questionnaire Bac Sciences,
5. collecte WhatsApp,
6. page paiement 199 DH,
7. envoi preuve paiement,
8. validation manuelle admin,
9. déblocage compte,
10. diagnostic personnalisé,
11. app simple,
12. plan 30 jours,
13. prompts IA adaptés,
14. interface français/arabe.

---

# 10. Fonctionnalités P0

## P0.1 Landing page

Objectif : expliquer l’offre rapidement.

Contenu minimum :

* promesse,
* prix : 199 DH,
* public cible : Bac Sciences Maroc,
* bénéfices,
* bouton “Créer mon compte”,
* mention : “Résultat accessible après validation du paiement.”

---

## P0.2 Authentification élève

L’élève doit pouvoir :

* créer un compte,
* se connecter,
* se déconnecter,
* accéder à son espace,
* voir son statut de compte.

Champs minimum :

* prénom,
* nom ou pseudo,
* WhatsApp,
* email ou identifiant,
* mot de passe,
* langue préférée,
* filière : Sciences.

Statuts compte :

```text
en_attente
valide
refuse
suspendu
```

---

## P0.3 Questionnaire diagnostic

Durée cible : **3 à 5 minutes**.

Sections :

* niveau général,
* option sciences,
* matières faibles,
* organisation,
* méthode de révision,
* stress,
* usage de l’IA,
* temps disponible,
* objectif personnel.

---

## P0.4 Paiement manuel

Paiement via :

* CashPlus,
* WafaCash,
* autre canal manuel équivalent.

Process :

```text
L’élève crée un compte
→ Il remplit le questionnaire
→ Il reçoit les instructions de paiement
→ Il paie 199 DH
→ Il envoie la preuve sur WhatsApp
→ L’admin vérifie
→ L’admin valide le compte
→ L’élève accède au diagnostic et à l’app
```

---

## P0.5 Espace admin simple

L’admin doit pouvoir :

* se connecter,
* voir les comptes créés,
* filtrer les comptes en attente,
* consulter les infos élève,
* consulter le statut paiement,
* valider un compte,
* refuser un compte,
* suspendre un compte,
* ajouter une note interne.

Statuts paiement :

```text
non_paye
preuve_recue
paiement_valide
paiement_refuse
```

---

## P0.6 Résultat diagnostic

Le diagnostic affiche :

* profil élève,
* problème principal,
* forces,
* faiblesses,
* stratégie recommandée,
* plan 30 jours,
* conseils IA,
* routine quotidienne,
* prochaines actions.

---

## P0.7 App simple

L’app P0 contient :

* page diagnostic,
* plan de révision 30 jours,
* routine quotidienne,
* prompts IA recommandés,
* checklist de progression,
* conseils par profil.

---

# 11. Fonctionnalités P1

À ajouter après validation marché :

* paiement en ligne automatisé,
* PDF diagnostic,
* email transactionnel,
* relances WhatsApp automatisées,
* dashboard de progression,
* ajout filière économie,
* ajout filière lettres,
* historique des plans,
* contenu plus détaillé par matière,
* récupération mot de passe avancée.

---

# 12. Fonctionnalités P2

À différer :

* application mobile native,
* coaching premium 499 DH,
* espace parent,
* IA conversationnelle avancée,
* suivi détaillé par matière,
* recommandations automatiques,
* communauté élèves,
* gamification,
* programme complet à 199 DH,
* statistiques avancées.

---

# 13. Hors périmètre MVP

Ne pas faire en P0 :

* app mobile native,
* paiement carte bancaire,
* IA libre non contrôlée,
* dashboard complexe,
* multi-filières,
* espace parent,
* correction automatique avancée,
* marketplace de cours,
* promesse de réussite garantie,
* collecte de CIN,
* collecte de données bancaires.

---

# 14. Parcours utilisateur

```text
Accueil
→ Création compte
→ Connexion
→ Questionnaire
→ Instructions paiement 199 DH
→ Paiement CashPlus / WafaCash
→ Envoi preuve WhatsApp
→ Compte en attente
→ Admin vérifie paiement
→ Admin valide compte
→ Élève se reconnecte
→ Résultat diagnostic
→ Accès app
→ Plan de révision + prompts IA + routine
```

---

# 15. Parcours admin

```text
Connexion admin
→ Tableau comptes
→ Filtre “en attente”
→ Consultation fiche élève
→ Vérification paiement
→ Validation / refus / suspension
→ Note interne si besoin
→ Accès élève mis à jour automatiquement
```

---

# 16. Questionnaire V1

## Informations de base

1. Prénom
2. Nom ou pseudo
3. WhatsApp
4. Email ou identifiant
5. Langue préférée : français / arabe
6. Filière : Sciences
7. Option : PC / SVT / Maths / autre

## Niveau

8. Moyenne approximative actuelle

   * moins de 8
   * 8 à 10
   * 10 à 12
   * 12 à 14
   * plus de 14

9. Matières les plus difficiles

   * maths
   * physique-chimie
   * SVT
   * philosophie
   * français
   * anglais
   * arabe
   * autre

## Organisation

10. As-tu un planning clair ?

* oui
* parfois
* non

11. Combien d’heures peux-tu réviser par jour ?

* moins de 1h
* 1h à 2h
* 2h à 4h
* plus de 4h

## Méthode

12. Ta méthode principale aujourd’hui :

* relire les cours
* regarder des vidéos
* faire des exercices
* faire des anciens examens
* je ne sais pas

13. Quand tu fais une erreur :

* je la corrige rapidement
* je la note parfois
* je passe à autre chose
* je ne comprends pas mes erreurs

## Stress

14. Ton stress avant les contrôles/examens :

* faible
* moyen
* élevé
* très élevé

15. Pendant l’examen :

* je reste calme
* je perds parfois mes moyens
* je panique souvent

## IA

16. Utilises-tu ChatGPT ou une IA ?

* oui souvent
* parfois
* jamais

17. Quand tu utilises l’IA :

* elle m’explique
* elle me donne directement la réponse
* je copie sans comprendre
* je ne sais pas l’utiliser

## Objectif

18. Ton objectif principal :

* sauver l’année
* avoir la moyenne
* améliorer ma note
* viser une bonne mention

---

# 17. Profils élèves

| Profil         | Description                      | Besoin principal       |
| -------------- | -------------------------------- | ---------------------- |
| 🔵 Perdu       | Ne sait pas par où commencer     | Simplification         |
| 🟢 Passif      | Relit beaucoup mais pratique peu | Exercices actifs       |
| 🟡 Désorganisé | Travaille sans planning clair    | Organisation           |
| 🔴 Stressé     | Bloqué par le stress             | Répétition + confiance |
| 🟣 Optimiseur  | Bon niveau, veut gagner plus     | Performance            |

---

# 18. Scoring V1

## Axes de scoring

| Axe          | Mesure                                 |
| ------------ | -------------------------------------- |
| Clarté       | L’élève sait-il quoi faire ?           |
| Action       | Fait-il assez d’exercices ?            |
| Organisation | A-t-il un planning ?                   |
| Stress       | Le stress bloque-t-il la performance ? |
| Optimisation | A-t-il déjà une base solide ?          |

## Attribution profil

| Profil      | Condition dominante                           |
| ----------- | --------------------------------------------- |
| Perdu       | faible clarté + faible méthode                |
| Passif      | beaucoup de relecture/vidéo + peu d’exercices |
| Désorganisé | pas de planning + temps mal structuré         |
| Stressé     | stress élevé + panique en examen              |
| Optimiseur  | niveau correct + objectif ambitieux           |

## Règle d’arbitrage

1. Si stress très élevé → profil Stressé prioritaire.
2. Si niveau très faible et aucune méthode → profil Perdu.
3. Si pas de planning → profil Désorganisé.
4. Si relit/regarde mais pratique peu → profil Passif.
5. Si niveau ≥ 12 et objectif ambitieux → profil Optimiseur.

---

# 19. Logique IA retenue

## Décision P0

Pas d’IA totalement libre en MVP.

Le système utilise :

* templates contrôlés,
* variables personnalisées,
* scoring,
* contenus par profil,
* prompts adaptés.

## Variables personnalisées

* prénom,
* langue,
* niveau,
* matière faible,
* stress,
* temps disponible,
* méthode actuelle,
* objectif,
* profil.

## Pourquoi cette approche

Elle est :

* plus fiable,
* moins coûteuse,
* plus simple à contrôler,
* plus adaptée à un produit éducatif,
* plus sécurisée pour des élèves potentiellement mineurs.

---

# 20. Résultat personnalisé attendu

Chaque résultat doit contenir :

1. titre du profil,
2. explication simple,
3. problème principal,
4. erreurs probables,
5. forces actuelles,
6. stratégie recommandée,
7. routine quotidienne,
8. plan 30 jours,
9. prompts IA adaptés,
10. message motivationnel,
11. bouton vers l’app.

---

# 21. Règles pédagogiques

Le produit doit respecter ces principes :

* ne pas remplacer le travail de l’élève,
* ne pas encourager la triche,
* ne pas donner uniquement des réponses directes,
* encourager la compréhension,
* pousser aux exercices,
* répéter les erreurs,
* favoriser l’apprentissage actif,
* donner des étapes simples,
* adapter le niveau d’explication.

Règle clé :

> L’IA doit aider l’élève à comprendre, pas à tricher.

---

# 22. Prompts IA par profil

## 🔵 Perdu

```text
Explique-moi cette leçon comme si je partais de zéro. Donne-moi d’abord l’idée simple, puis un exemple, puis un exercice facile.
```

## 🟢 Passif

```text
Ne me donne pas directement la réponse. Pose-moi une question à la fois pour m’aider à résoudre cet exercice.
```

## 🟡 Désorganisé

```text
Transforme ce chapitre en plan de révision sur 3 jours avec exercices, rappels et mini-test.
```

## 🔴 Stressé

```text
Fais-moi réviser ce point calmement avec des étapes simples, puis donne-moi 3 exercices progressifs.
```

## 🟣 Optimiseur

```text
Donne-moi les erreurs fréquentes sur ce type d’exercice et une méthode rapide pour gagner un maximum de points.
```

---

# 23. Plan de révision 30 jours

Structure générique P0 :

| Période     | Objectif                        |
| ----------- | ------------------------------- |
| Jours 1-3   | Diagnostic + remise à niveau    |
| Jours 4-10  | Bases prioritaires              |
| Jours 11-20 | Exercices + anciens examens     |
| Jours 21-27 | Correction erreurs + répétition |
| Jours 28-30 | Simulation + stratégie examen   |

Chaque jour doit contenir :

* matière prioritaire,
* tâche courte,
* exercice,
* correction,
* mini-révision,
* action IA recommandée.

---

# 24. Données collectées

## Données P0

* prénom,
* nom ou pseudo,
* WhatsApp,
* email ou identifiant,
* mot de passe hashé,
* langue préférée,
* filière,
* option sciences,
* réponses questionnaire,
* profil généré,
* statut compte,
* statut paiement,
* date de création,
* date de validation,
* note admin éventuelle.

## Données à éviter

* CIN,
* adresse complète,
* données bancaires,
* nom de lycée si non nécessaire,
* informations parentales non nécessaires,
* données médicales,
* données sensibles inutiles.

---

# 25. Paiement

## P0

Paiement manuel :

* CashPlus,
* WafaCash,
* autre canal manuel équivalent.

## Statuts paiement

```text
non_paye
preuve_recue
paiement_valide
paiement_refuse
```

## Règles paiement

* ne jamais stocker de données de carte bancaire,
* conserver uniquement une preuve minimale,
* source de vérité côté admin/serveur,
* accès bloqué avant validation paiement,
* toute validation doit être liée à un compte élève.

---

# 26. Authentification & accès

## Règles auth

* un compte est obligatoire,
* un compte non validé ne peut pas accéder au diagnostic complet,
* un compte non validé ne peut pas accéder à l’app,
* un compte suspendu perd l’accès,
* l’admin peut changer le statut du compte.

## Statuts compte

```text
en_attente
valide
refuse
suspendu
```

## Accès selon statut

| Statut compte | Accès                    |
| ------------- | ------------------------ |
| en_attente    | écran attente uniquement |
| valide        | diagnostic + app         |
| refuse        | message refus            |
| suspendu      | accès bloqué             |

---

# 27. Notifications

## P0

WhatsApp uniquement.

Messages nécessaires :

* instructions de paiement,
* confirmation réception preuve,
* confirmation validation compte,
* message en cas de refus,
* rappel si compte en attente.

## P1

* email,
* notifications app,
* rappels automatiques,
* relances de progression.

---

# 28. Contraintes techniques haut niveau

* Web mobile-first.
* Interface simple.
* Authentification obligatoire.
* Admin séparé.
* Accès protégé côté serveur.
* Multilingue français/arabe.
* Templates modifiables.
* Pas de dépendance lourde.
* Architecture compatible avec paiement automatisé futur.
* Chargement rapide sur mobile.

---

# 29. Modèle de données haut niveau

## User / Élève

* id
* prénom
* nom/pseudo
* WhatsApp
* email/identifiant
* mot de passe hashé
* langue
* filière
* option
* statut compte
* date création
* date validation

## QuestionnaireResponse

* id
* user_id
* réponses
* score clarté
* score action
* score organisation
* score stress
* score optimisation
* profil final
* date soumission

## Payment

* id
* user_id
* montant
* canal
* statut paiement
* référence éventuelle
* date paiement déclarée
* date validation admin

## AdminNote

* id
* user_id
* admin_id
* note
* date

---

# 30. Contraintes sécurité

Minimum obligatoire :

* mots de passe hashés,
* sessions sécurisées,
* accès admin protégé,
* séparation rôle `eleve` / `admin`,
* contrôle serveur sur toutes les pages protégées,
* protection contre accès direct aux résultats,
* protection brute-force basique,
* logs sans données sensibles,
* pas de statut paiement modifiable côté client.

Règle critique :

> Même si l’élève connaît l’URL du résultat, il ne doit pas pouvoir y accéder sans compte validé.

---

# 31. Contraintes RGPD / données personnelles

Même si le projet vise le Maroc, appliquer une logique de minimisation.

Exigences :

* collecter uniquement les données nécessaires,
* expliquer pourquoi WhatsApp est demandé,
* permettre la suppression des données sur demande,
* ne pas revendre les données,
* ne pas collecter de données scolaires excessives,
* limiter la conservation des leads inactifs,
* protéger les accès admin.

Recommandation P0 :

* leads non validés : conservation 90 jours maximum,
* comptes clients : conservation pendant la durée d’accès,
* suppression ou anonymisation sur demande.

---

# 32. Contraintes légales

À afficher clairement :

* le produit ne garantit pas la réussite au bac,
* le produit ne remplace pas l’école,
* les résultats sont indicatifs,
* l’app aide à mieux réviser,
* paiement manuel en MVP,
* accès après validation admin,
* politique de remboursement à définir.

Pour les mineurs :

* ton responsable,
* pas de pression commerciale excessive,
* pas de dark pattern,
* mention : accord parent recommandé.

---

# 33. KPIs de succès

## Acquisition

* taux de visite landing,
* taux clic “Créer mon compte”,
* taux création compte.

## Activation

* taux questionnaire complété,
* taux WhatsApp collecté,
* taux preuve paiement envoyée,
* délai moyen de validation admin.

## Conversion

* taux paiement 199 DH,
* taux comptes validés,
* chiffre d’affaires.

## Produit

* taux accès diagnostic,
* taux consultation plan 30 jours,
* satisfaction élève,
* taux retour utilisateur.

---

# 34. Critères d’acceptation MVP

Le MVP est accepté si :

1. un élève peut créer un compte depuis mobile,
2. un élève peut se connecter,
3. un élève peut remplir le questionnaire,
4. le questionnaire est complétable en moins de 5 minutes,
5. l’élève voit les instructions de paiement 199 DH,
6. l’élève peut envoyer sa preuve via WhatsApp,
7. l’admin peut voir les comptes en attente,
8. l’admin peut valider/refuser/suspendre un compte,
9. un compte non validé ne peut pas accéder au diagnostic complet,
10. un compte validé accède au diagnostic et à l’app,
11. le résultat affiche un profil clair,
12. le plan 30 jours est disponible,
13. les contenus existent en français et arabe,
14. aucune promesse de réussite garantie n’est affichée,
15. les accès sont contrôlés côté serveur.

---

# 35. Risques & mitigations

| Risque                         |    Niveau | Mitigation                              |
| ------------------------------ | --------: | --------------------------------------- |
| Paiement manuel lent           |     Moyen | Process admin simple + WhatsApp clair   |
| Trop de comptes à valider      |     Moyen | Tableau admin avec filtres              |
| Résultat perçu comme générique |      Fort | Variables personnalisées + profil clair |
| Double langue ralentit         |     Moyen | Français source + arabe essentiel       |
| Partage d’accès                |     Moyen | Auth obligatoire + statut serveur       |
| Mot de passe oublié            | Faible P0 | Support manuel au départ                |
| Données mineurs                |     Moyen | Collecte minimale + mentions claires    |
| Conversion faible à 199 DH      |     Moyen | Tester promesse + aperçu gratuit        |

---

# 36. Hypothèses & validation

| Hypothèse                           | Confiance | Impact            | Validation                      |
| ----------------------------------- | --------: | ----------------- | ------------------------------- |
| Les élèves paieront 199 DH           |   Moyenne | Business critique | Prévente 7 jours                |
| Auth obligatoire ne bloque pas trop |   Moyenne | Conversion        | Mesurer abandon création compte |
| Validation manuelle acceptable      |   Moyenne | Opérationnel      | Suivre volume comptes           |
| Sciences seules suffisent           |     Forte | Scope réduit      | Lancement P0                    |
| Templates contrôlés suffisent       |     Forte | Qualité           | Feedback élèves                 |
| WhatsApp est le bon canal           |     Forte | Activation        | Mesurer taux contact            |

---

# 37. Decision Log

| Décision                | Justification         | Impact                     |
| ----------------------- | --------------------- | -------------------------- |
| Web mobile-first        | Rapide à lancer       | Pas d’app native P0        |
| Bac Sciences uniquement | Réduction du scope    | Autres filières plus tard  |
| Prix 199 DH              | Offre accessible      | Test marché rapide         |
| Paiement manuel         | Simple au démarrage   | Charge admin               |
| Auth obligatoire        | Contrôle des accès    | MVP un peu plus lourd      |
| Validation admin        | Tu gardes le contrôle | Activation non automatique |
| IA contrôlée            | Fiabilité pédagogique | Moins complexe             |
| Français + arabe        | Adapté Maroc          | Double contenu             |

---

# 38. Handoff vers NOVA SQUAD

## Commandes recommandées

```text
/KICKOFF
/PRD
/UX
/RULES
/ARCHI
/API
/DB
/SEC
/RGPD
/SPRINT
```

## Brief NovaSquad

Construire un MVP web mobile-first pour **BAC IA Maroc**, permettant à un élève Bac Sciences de créer un compte, remplir un questionnaire, payer 199 DH manuellement, attendre validation admin, puis accéder à un diagnostic personnalisé et une app simple de révision.

## Scope P0 à construire

* landing page,
* création compte,
* connexion élève,
* questionnaire,
* scoring,
* paiement manuel,
* espace admin,
* validation manuelle,
* blocage accès avant validation,
* diagnostic personnalisé,
* app simple,
* contenu français/arabe.

## À ne pas complexifier

* pas d’app native,
* pas de paiement carte,
* pas d’IA libre,
* pas de dashboard avancé,
* pas de multi-filières,
* pas d’automatisation lourde.

---

# 39. Gate DoR avant développement

À valider avant sprint :

1. textes exacts français/arabe,
2. coordonnées CashPlus / WafaCash,
3. méthode de réception preuve paiement,
4. durée d’accès à l’app,
5. politique remboursement,
6. contenu exact du résultat,
7. contenu minimal du plan 30 jours,
8. identifiants/admin initial,
9. règles de suspension/refus compte,
10. message affiché aux comptes en attente.

---

# 40. Statut final NOVA CDC

**CDC v1.1 finalisé et prêt à transmettre à NovaSquad.**

Décision finale :

> Le MVP doit rester simple, mais inclure une authentification obligatoire et une validation manuelle des comptes par admin.
> L’accès au diagnostic complet et à l’app est autorisé uniquement après paiement confirmé et compte validé.
