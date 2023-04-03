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
  dockerfile="./Dockerfile"
  if [[ -e "$1/Dockerfile" ]]; then
    dockerfile="$1/Dockerfile"
  fi

  docker buildx build -f $dockerfile --build-context libs=../libs -t ghcr.io/quinten1333/mt-blocks:$1 $1
}

function push() {
  docker push -t ghcr.io/quinten1333/mt-blocks:$1
}

if [[ $block == 'all' ]]; then
  for dir in *; do
    if [[ -d $dir ]]; then
      echo "$dir"
      if [[ $cmd == 'build' || $cmd == 'push' ]]; then
        $cmd $dir
      else
        $(cd "$dir" && block="$dir" sh -c "$cmd")
      fi
    fi
  done
else
  $cmd $block
fi

