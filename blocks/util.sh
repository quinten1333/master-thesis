#!/bin/bash
cmd=$1
block=$2

if [[ -z "$cmd" ]]; then
  echo "Required cmd parameter not supplied!"
  echo "Cmd can be any executable"
  echo "Special cmds: build and push"
  exit 1
fi

if [[ -z "$block" ]]; then
  echo "Required block parameter not supplied!"
  exit 1
fi

function build() {
  docker buildx build -f ./Dockerfile --build-context libs=../libs -t ghcr.io/quinten1333/mt-blocks:$1 $1
}

function push() {
  docker push -t ghcr.io/quinten1333/mt-blocks:$1
}

if [[ $block == 'all' ]]; then
  for dir in *; do
    if [[ -d $dir ]]; then
      echo "$dir"
      $cmd "$dir"
    fi
  done
else
  $cmd $block
fi

