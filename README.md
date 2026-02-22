# Facture App – Générateur de factures (léger)

Application web **sans installation lourde** : vous n’avez rien à télécharger depuis un store. Ouvrez-la dans le navigateur de votre téléphone ou ordinateur.

## Utilisation sur téléphone

1. **Héberger l’app** (une des options) :
   - Copier le dossier `facture-app` sur un hébergement web (hébergeur, GitHub Pages, etc.) et ouvrir l’URL sur votre téléphone.
   - Ou ouvrir les fichiers en local : sur PC, double-cliquer sur `index.html` ; sur téléphone, utiliser un serveur local (ex. "Live Server" sur PC puis accès via le même réseau).

2. **Ajouter à l’écran d’accueil** (optionnel) :  
   Dans le navigateur (Chrome/Safari), menu → **« Ajouter à l’écran d’accueil »** (ou « Installer l’application »). Une icône apparaît comme une app, sans télécharger un gros fichier depuis un store.

3. **Contenu** :
   - **Société** : vos infos (raison sociale, RC, IF, Patente, ICE, adresse, tél).
   - **Client** : nom et ICE du client.
   - **Facture** : numéro, date, lignes (désignation, prix unitaire, quantité), TVA %. Génération du PDF au format de votre exemple.

Les données (société, client) sont enregistrées **uniquement sur votre appareil** (localStorage). Aucun serveur ne les reçoit.

## Fichiers

- `index.html` – page principale
- `styles.css` – mise en forme
- `app.js` – logique et génération PDF (jsPDF chargé depuis un CDN, une seule librairie)
- `manifest.json` – PWA (nom, mode standalone)

## Dépendance

- **jsPDF** : chargée via CDN (cdnjs). Aucun `npm install` ni gros téléchargement sur le téléphone ; le script est mis en cache après la première visite.
