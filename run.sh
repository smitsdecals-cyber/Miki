#!/usr/bin/env bash
# Démarre le configurateur Miki sur votre Mac/Linux.
# Double-cliquez ce fichier ou lancez-le dans un Terminal.

cd "$(dirname "$0")"

if ! command -v java >/dev/null 2>&1; then
  echo
  echo "❌ Java n'est pas installé sur votre ordinateur."
  echo
  echo "👉 Téléchargez-le ici (gratuit, 1 minute) :"
  echo "   https://adoptium.net/temurin/releases/?version=21"
  echo
  echo "Choisissez la version « 21 », type « JDK », puis votre système."
  echo "Une fois Java installé, relancez ce script."
  echo
  read -p "Appuyez sur Entrée pour fermer..."
  exit 1
fi

echo "✅ Java détecté."
echo "⏳ Démarrage du configurateur (premier lancement : 1 à 2 minutes)..."
echo

./mvnw -q spring-boot:run &
PID=$!

# Attente que le serveur réponde
echo "   Préparation en cours..."
for i in {1..120}; do
  if curl -s -o /dev/null http://localhost:8080/configurator.html 2>/dev/null; then
    echo
    echo "✅ Prêt ! Ouvrez votre navigateur sur :"
    echo
    echo "   👉 Configurateur :  http://localhost:8080/configurator.html"
    echo "   👉 Administration : http://localhost:8080/admin.html"
    echo
    # Tente d'ouvrir le navigateur automatiquement
    if command -v open >/dev/null 2>&1; then open http://localhost:8080/configurator.html
    elif command -v xdg-open >/dev/null 2>&1; then xdg-open http://localhost:8080/configurator.html
    fi
    echo "⏹  Pour ARRÊTER : fermez cette fenêtre ou appuyez sur Ctrl+C."
    wait $PID
    exit 0
  fi
  sleep 1
done

echo "⚠️  Démarrage trop long. Consultez les messages ci-dessus."
wait $PID
