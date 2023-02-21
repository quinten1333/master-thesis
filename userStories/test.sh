echo "reboot" > ../libs/msamessaging/reboot.js

python -m src thesisfairPlatform.yml $@

curl -X POST --data-urlencode "yaml=$(cat thesisfairPlatform.yml-compiled.yml | sed "s/\"/'/g")" localhost:3001/architecture
echo
curl localhost:3001/architecture/0/active?active=true
echo

sleep 0.1
curl http://localhost:3000/user/login?username=quinten
echo
