import fs from 'node:fs/promises';
import { MongoClient } from 'mongodb';

import archApi from '../../blocks/architectureManager/frontend/src/api.js'
import appApi from './thesisFairPlatformApi.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function uploadFile(path) {
  const yaml = (await fs.readFile(path)).toString();
  const compiledYaml = (await archApi.userStories.compile(yaml)).data;
  await fs.writeFile('./compiled.yml', compiledYaml);

  return await archApi.architecture.create(compiledYaml);
}

async function dropDatabase(database, url = 'mongodb://dataset-mongodb:27017/') {
  const client = await MongoClient.connect(url)
  const db = client.db(database);
  await db.dropDatabase();
  await client.close();
}

async function setup() {
  await fs.writeFile('../../libs/msamessaging/reboot.js', 'reboot');
  await dropDatabase('thesisFairPlatform')
  await sleep(750);
}

export async function test() {
  await setup();

  const archId = await uploadFile('./thesisfairPlatform.yml')
  console.log('archId:', archId);
  await archApi.architecture.setActive(archId, true);
  await sleep(100);

  await appApi.user.register('quinten', 'quintencoltof1@gmail.com', 'pwd');
  await appApi.user.login('quinten', 'pwd');
  console.log(appApi.user.tokenPresent());
  console.log(await appApi.user.validate())
}

