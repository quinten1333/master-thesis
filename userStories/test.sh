echo "reboot" > ../libs/msamessaging/reboot.js

python ../libs/userStoryCompiler/run.py thesisfairPlatform.yml $@

if [ $1 ]; then
  exit
fi

curl -X POST --data-urlencode "yaml=$(cat compiled.yml | sed "s/\"/'/g")" http://localhost:3001/api/architecture
echo
curl -X PATCH -H 'Content-Type: application/json' -d '{"state": 1}' http://localhost:3001/api/architecture/0
echo

sleep 0.1
curl "http://localhost:3000/user/login?username=quinten&password=pwd"
echo
