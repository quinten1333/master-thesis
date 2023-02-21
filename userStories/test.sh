echo "reboot" > ../libs/msamessaging/reboot.js

python -m src thesisfairPlatform.yml $@

if [ $1 ]; then
  exit
fi

curl -X POST --data-urlencode "yaml=$(cat compiled.yml | sed "s/\"/'/g")" localhost:3001/architecture
echo
curl localhost:3001/architecture/0/active?active=true
echo

sleep 0.1
curl "http://localhost:3000/user/login?username=quinten&password=pwd"
echo
