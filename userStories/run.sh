echo "reboot" > ../libs/msamessaging/reboot.js

for file in ./examples/*; do
  python -m src $file

  curl -X POST --data-urlencode "yaml=$(cat compiled.yml | sed "s/\"/'/g")" localhost:3001/api/architecture
  echo
done
