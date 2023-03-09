#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test } from './test.js';

const execFilePromise = promisify(execFile);


async function runDebug() {
  const res = await execFilePromise('python', ['../../blocks/userStoryCompiler/src/run.py', './thesisfairPlatform.yml', ...process.argv.slice(2)])
  console.log(res.stdout);
}

function main() {
  if (process.argv.length == 2) {
    return test();
  } else {
    return runDebug()
  }
}

main();

