# Comment tester le configurateur — guide pour débutants

> Aucune connaissance informatique nécessaire. Suivez les étapes dans l'ordre.
> Temps total : environ **10 minutes** (la première fois seulement).

---

## Étape 1 — Installer Java (une seule fois dans votre vie)

Java, c'est le moteur qui fait tourner le configurateur. C'est gratuit et
sûr (utilisé par des millions d'ordinateurs).

1. Allez sur ce site : **https://adoptium.net/temurin/releases/?version=21**
2. Dans les menus déroulants, choisissez :
   - **Operating System** → votre système (`Windows`, `macOS` ou `Linux`)
   - **Architecture** → `x64` (ou `aarch64` si Mac avec puce M1/M2/M3)
   - **Package Type** → `JDK`
   - **Version** → `21 - LTS`
3. Cliquez sur le bouton **.msi** (Windows) ou **.pkg** (Mac) à côté de
   « JDK ».
4. Ouvrez le fichier téléchargé et cliquez **Suivant / Continuer / Installer**
   jusqu'au bout.

C'est fait, vous n'aurez plus jamais à le refaire.

---

## Étape 2 — Récupérer le projet sur votre ordinateur

### Solution A — Le plus simple : télécharger en ZIP

1. Allez sur la page GitHub du projet
2. Bouton vert **« Code »** → **« Download ZIP »**
3. **Décompressez** le ZIP (clic droit → Extraire) dans un dossier facile
   à retrouver, par exemple votre Bureau.

### Solution B — Si Git est installé

```
git clone <URL-du-dépôt>
```

---

## Étape 3 — Lancer le configurateur (2 clics)

Ouvrez le dossier `Miki` que vous venez de décompresser.

### Sur Windows

**Double-cliquez sur `run.bat`**

- Une fenêtre noire s'ouvre. **Ne la fermez pas**, elle fait tourner le
  configurateur.
- Au bout de 1 à 2 minutes (la première fois seulement), votre navigateur
  s'ouvre tout seul sur le configurateur.

> ⚠️ Si Windows affiche « Windows a protégé votre ordinateur », cliquez
> sur **Informations complémentaires** puis **Exécuter quand même**.

### Sur Mac

1. Ouvrez l'application **Terminal** (Spotlight `Cmd + Espace`, tapez
   « Terminal »).
2. Tapez `cd ` puis **glissez-déposez** le dossier `Miki` dans le terminal,
   puis appuyez sur **Entrée**.
3. Tapez :
   ```
   ./run.sh
   ```
   et appuyez sur **Entrée**.

Au bout de 1 à 2 minutes, votre navigateur s'ouvre sur le configurateur.

---

## Étape 4 — Tester le configurateur

Votre navigateur affiche un **T-shirt bleu** d'exemple.

### Changer une couleur
- Sur la **gauche**, sous « Couleurs », cliquez sur le carré bleu à côté
  de « tshirt » → choisissez une autre couleur.

### Modifier le texte
- Sous « Textes », cliquez dans la case « VOTRE TEXTE » et tapez ce que
  vous voulez.

### Ajouter un logo
- Sur la **droite**, vous voyez 3 logos : Étoile, Cœur, Éclair.
- **Glissez-déposez** un de ces logos sur le carré pointillé « Logo » au
  centre du T-shirt.
- Vous pouvez ensuite **bouger le logo** en le faisant glisser dans le
  visuel.
- Touche **Suppr** du clavier pour le retirer.

### Télécharger votre création
- Bouton **« Exporter SVG »** ou **« Exporter PNG »** en bas à gauche.

---

## Étape 5 — Gérer votre bibliothèque de logos

En haut à droite, cliquez sur **« Admin »**. Vous arrivez sur la page
d'administration.

### Ajouter un de vos logos

1. Onglet **« Logos »** (déjà sélectionné).
2. Remplissez **Nom** (par ex. « Mon logo entreprise »).
3. **Catégorie** (par ex. « marques »).
4. Bouton **Choisir un fichier** → sélectionnez un fichier `.svg` créé
   avec Illustrator.
5. Cliquez **Ajouter le logo**.

Retournez sur le configurateur (lien en haut à gauche), il apparaît dans
la bibliothèque !

### Supprimer un logo

Dans la liste à droite, bouton rouge **Supprimer**.

---

## Étape 6 — Ajouter VOS propres modèles (T-shirt, mug, etc.)

1. Dans Illustrator, créez votre visuel.
2. **Renommez les calques** selon ce qui doit être modifiable :

   | Calque nommé… | Effet pour le client |
   |---|---|
   | `color_fond`, `color_tshirt`, `color_logo`… | La couleur sera modifiable |
   | `texte_titre`, `texte_slogan`… | Le texte sera modifiable |
   | `logo_principal`, `logo_petit`… | Emplacement pour glisser un logo |

   Le préfixe est obligatoire (`color_`, `texte_`, `logo_`). Le reste du
   nom est libre.

3. **Fichier → Exporter sous → SVG**. Dans la boîte qui s'ouvre :
   - **Styling** : Presentation Attributes
   - **Object IDs** : Layer Names
   - Cliquez **OK**.

4. Sur la page **Admin**, onglet **« Templates »** :
   - **Nom** (ex. « Mon T-shirt »)
   - **Fichier SVG** : choisissez votre fichier
   - **Ajouter le template**

5. Retournez sur le configurateur : votre modèle est dans le menu
   déroulant en haut à gauche.

> 💡 Un onglet **« Guide Illustrator »** dans l'admin résume tout ça.

---

## Étape 7 — Arrêter le configurateur

- **Windows** : fermez la fenêtre noire intitulée « Miki Configurator ».
- **Mac** : dans le Terminal, appuyez sur `Ctrl + C`, puis fermez la
  fenêtre.

Vos logos et templates sont **sauvegardés** dans le dossier `data/` à
côté du projet. La prochaine fois que vous lancerez `run.sh` / `run.bat`,
tout sera là.

---

## Étape 8 — Mettre en ligne sur Shopify

Quand tout fonctionne sur votre ordinateur et que vous êtes prêt à
publier sur votre vraie boutique Shopify, il faudra :

1. **Mettre l'application sur un serveur en ligne** (votre ordinateur ne
   peut pas l'héberger en permanence). Hébergeurs simples et peu chers
   pour démarrer : **Railway.app**, **Render.com**, ou **Fly.io**
   (versions gratuites ou ~5 €/mois).
2. Récupérer l'adresse **https://…** que l'hébergeur vous donne.
3. Dans votre admin Shopify, **Online Store → Themes → Edit code →
   snippets**, ajouter un fichier `miki-configurator.liquid` avec le
   contenu du fichier `shopify/miki-configurator.liquid` du projet.
4. Dans la page produit où vous voulez le configurateur, ajouter :

   ```
   {% render 'miki-configurator', endpoint: 'https://votre-adresse.fr' %}
   ```

(Cette dernière étape demande un petit coup de main d'un développeur ou
de l'aide d'un freelance Shopify — comptez 30 min à 1h de leur temps.)

---

## Quelque chose ne marche pas ?

| Problème | Solution |
|---|---|
| « Java n'est pas reconnu » | Retournez à l'étape 1, redémarrez l'ordinateur après l'installation |
| Le navigateur ne s'ouvre pas tout seul | Ouvrez Chrome / Firefox et tapez `http://localhost:8080/configurator.html` |
| « Port 8080 déjà utilisé » | Fermez les autres applications qui pourraient l'utiliser, ou redémarrez l'ordinateur |
| Page vide | Attendez 2 minutes après le démarrage et rafraîchissez (F5) |
| Mes logos ne s'affichent pas | Vérifiez qu'ils sont bien au format **SVG** (et pas PNG/JPG) |
