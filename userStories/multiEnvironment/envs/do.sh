docker compose -f central.yml $@ &
docker compose -f surf.yml $@ &
docker compose -f uva.yml $@ &
wait
