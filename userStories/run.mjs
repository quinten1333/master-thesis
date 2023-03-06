import fs from 'node:fs/promises';
import { join } from 'node:path';
import api from '../blocks/architectureManager/frontend/src/api.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function uploadFile(path) {
  const yaml = (await fs.readFile(path)).toString();
  const compiledYaml = (await api.userStories.compile(yaml)).data;

  return await api.architecture.create(compiledYaml);
}

async function main() {
  await fs.writeFile('../libs/msamessaging/reboot.js', 'reboot');
  await sleep(750);


  const root = './examples';
  for (const file of await fs.readdir(root, { withFileTypes: true })) {
    if (!file.isFile()) { continue; }
    const path = join(root, file.name);
    console.log(await uploadFile(path));
  }
}

main();

