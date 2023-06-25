#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'fs/promises';
import archApi from '../../../blocks/architectureManager/frontend/src/api.js'


const execFilePromise = promisify(execFile);


async function main() {
  await fs.writeFile('../../../libs/pipelinemessaging/reboot.js', 'reboot');
  const res = await execFilePromise('python', ['../../../blocks/userStoryCompiler/src/run.py', './thesisfairPlatform.yml', ...process.argv.slice(2)])
  if (process.argv.length != 2) {
    console.log(res.stdout);
    return;
  }

  await execFilePromise('node', ['../../../cli/cli.js', './compiled.yml']);
}

main();

