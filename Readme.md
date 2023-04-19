# PLANT: User Story Toolchain

## Tools
From high level to low level:
- User story pipeline compiler (`/blocks/userStoryCompiler/src/compiler`)
- User story pipeline drawer (`/blocks/userStoryCompiler/src/drawer`)
- Pipeline messaging (`/libs/pipelinemessaging`)
- Blocks (`/blocks/*`)

## Running it yourself
1. Configure the .env file
1. Create the docker network: `docker network create master-thesis_default`
1. Open the project using VS Code dev containers
1. Run `docker compose up` in the root of the project.

Now all the microservices are up and running in development mode, meaning that any change will automatically reload them with the new changes.

## Required software
- docker
- docker compose
- docker buildx
- bash

- npm
- nodejs

- python3
- pip

- graphviz
