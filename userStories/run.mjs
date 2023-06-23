import fs from 'node:fs/promises';
import { join } from 'node:path';
import api from '../blocks/architectureManager/frontend/src/api.js'

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFilePromise = promisify(execFile);
// TODO: Use cli

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleFile(path) {
  const res = await execFilePromise('python', ['../blocks/userStoryCompiler/src/run.py', path]);
  await execFilePromise('node', ['../cli/cli.js', './compiled.yml']);
}

async function main() {
  await fs.writeFile('../libs/pipelinemessaging/reboot.js', 'reboot');
  await sleep(750);


  const root = './examples';
  for (const file of await fs.readdir(root, { withFileTypes: true })) {
    if (!file.isFile()) { continue; }
    const path = join(root, file.name);
    await handleFile(path);
    console.log('Deployed', file.name)
  }
}

main();

