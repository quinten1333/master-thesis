# PLANT: User Story Toolchain

## ICT Open
Slides can be found [here](https://github.com/quinten1333/master-thesis/blob/main/ICT-Open/presentation.pdf)

Documentation about the language can be found in the [userStories folder](https://github.com/quinten1333/master-thesis/blob/main/userStories/Readme.md)

## Tools
From high level to low level:
- User story pipeline compiler (`/blocks/userStoryCompiler/src/compiler`)
- User story pipeline drawer (`/blocks/userStoryCompiler/src/drawer`)
- Pipeline messaging (`/libs/pipelinemessaging`)
- Blocks(runtime environment) (`/blocks/*`)

## Running it yourself
1. Make a domain resolve to the the correct server (domain can also be *.localhost)
1. Configure the .env and .devcontainer/devcontainer.json files.
1. When using http, change the `architectureManager-frontend` its PORT environment variable and forwarded port to `80`.
1. Create the docker network: `docker network create master-thesis_default`
1. Open the project using VS Code dev containers
1. Run `docker compose up` in the root of the project.

Now all the microservices are up and running in development mode, meaning that any change will automatically reload them with the new changes.

## Required software
When not using the dev container
- docker
- docker compose
- docker buildx
- bash

- npm
- nodejs

- python3
- pip

- graphviz
