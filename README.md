# personal website

This repository is a central hub with useful links to follow my work and collaborate with me.

📬 Reach out on [LinkedIn](https://www.linkedin.com/in/emirbelkahia)

The "site": [emirbelkahia.com](https://emirbelkahia.com)

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Page d'accueil du site |
| `cv.html` | CV version web (publique, stylisée) |
| `cv-ats.html` | Source du CV PDF — format ATS, sans coordonnées (bot-safe) |
| `cv.pdf` | PDF généré depuis `cv-ats.html` avec email + téléphone injectés |

## Générer le PDF

Le PDF contient les coordonnées (email, téléphone) mais `cv-ats.html` ne les contient pas, pour éviter le crawling de bots.

```bash
# 1. Copier le fichier d'exemple et renseigner les vraies coordonnées
cp .env.example .env

# 2. Générer le PDF
./generate-pdf.sh
```

Le `.env` est dans le `.gitignore` — il ne sera jamais commité.
