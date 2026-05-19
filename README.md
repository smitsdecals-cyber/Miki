# Miki — Configurateur SVG pour Shopify

Application Java (Spring Boot) qui sert un configurateur SVG en ligne, à
intégrer dans une boutique Shopify via un snippet Liquid.

## Fonctionnalités

- **Templates SVG** : importez des visuels créés sous Illustrator
- **Édition de couleurs** : tout calque nommé `color_*` devient un sélecteur de couleur
- **Édition de texte** : tout calque nommé `texte_*` est modifiable (contenu, couleur, taille)
- **Logos** : tout calque nommé `logo_*` est un emplacement
  - cliquer + choisir un logo dans la bibliothèque
  - **drag & drop** depuis la bibliothèque
  - **drag** dans le visuel pour repositionner
  - touche `Suppr` pour retirer un logo posé
- **Bibliothèque de logos** : ajout / suppression / renommage en SVG via une page admin
- **Export** : SVG, PNG, ou envoi vers Shopify (panier)

## Démarrage local

Prérequis : Java 17+, Maven 3.9+.

```bash
mvn spring-boot:run
```

- Configurateur : <http://localhost:8080/configurator.html>
- Admin :        <http://localhost:8080/admin.html>

Au premier démarrage, un template de démo et trois logos sont chargés
automatiquement. La base SQLite est stockée dans `./data/miki.db`.

## Convention de nommage Illustrator

| Préfixe de calque | Effet                                                |
|-------------------|------------------------------------------------------|
| `color_xxx`       | Couleur de remplissage modifiable                    |
| `texte_xxx`       | Texte modifiable (contenu + couleur + taille + drag) |
| `logo_xxx`        | Emplacement de logo (clic / drag&drop / drag)        |

À l'export *Fichier → Exporter sous → SVG* :

- **Styling** : Presentation Attributes
- **Object IDs** : Layer Names
- **Decimal** : 2

Le nom de calque devient l'attribut `id` du `<g>` dans le SVG produit ; le
configurateur l'expose automatiquement dans l'UI.

## Intégration Shopify

1. Déployez l'application Java sur un hébergeur public (Railway, Fly.io,
   Render, OVH, AWS, etc.) en HTTPS.
2. Copiez `shopify/miki-configurator.liquid` dans le dossier `snippets/` de
   votre thème.
3. Dans le template produit (par ex. `sections/main-product.liquid`),
   ajoutez :

   ```liquid
   {% render 'miki-configurator',
        endpoint: 'https://votre-domaine.fr',
        height: '760px' %}
   ```

4. Quand le client clique sur **« Ajouter au panier »** dans le
   configurateur, le SVG personnalisé est posté en `properties[_svg]` sur
   la ligne du panier. Le préfixe `_` rend cette propriété invisible
   côté client (admin uniquement).

## API REST

| Verbe  | Chemin                | Rôle                                         |
|--------|-----------------------|----------------------------------------------|
| GET    | `/api/templates`      | Liste des templates                          |
| GET    | `/api/templates/{id}` | Détail (avec SVG)                            |
| POST   | `/api/templates`      | Création (multipart `file` ou JSON)          |
| DELETE | `/api/templates/{id}` | Suppression                                  |
| GET    | `/api/logos`          | Liste des logos                              |
| GET    | `/api/logos/{id}`     | Détail                                       |
| POST   | `/api/logos`          | Création (multipart `file` ou JSON)          |
| PUT    | `/api/logos/{id}`     | Renommage / changement de catégorie / SVG    |
| DELETE | `/api/logos/{id}`     | Suppression                                  |

## Sécurité

Les SVG importés sont nettoyés à la volée :

- balises `<script>` retirées
- attributs `on*` (event handlers) retirés
- liens `javascript:` neutralisés
- balises `<foreignObject>` retirées

Pour un déploiement public, ajoutez une couche d'authentification sur les
endpoints `/api/**` mutateurs (Spring Security).

## Build

```bash
mvn clean package
java -jar target/shopify-svg-configurator-1.0.0.jar
```
