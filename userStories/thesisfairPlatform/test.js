import fs from 'node:fs/promises';
import archApi from '../../blocks/architectureManager/frontend/src/api.js'
import appApi from './thesisFairPlatformApi.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function uploadFile(path) {
  const yaml = (await fs.readFile(path)).toString();
  const compiledYaml = (await archApi.userStories.compile(yaml)).data;
  await fs.writeFile('./compiled.yml', compiledYaml);

  return await archApi.architecture.create(compiledYaml);
}

async function main() {
  await fs.writeFile('../../libs/msamessaging/reboot.js', 'reboot');
  await sleep(750);

  const archId = await uploadFile('./thesisfairPlatform.yml')
  console.log('archId:', archId);
  await archApi.architecture.setActive(archId, true);
  await sleep(100);

  await appApi.user.login('quinten', 'pwd');
  console.log(await appApi.user.validate())
}

main();

