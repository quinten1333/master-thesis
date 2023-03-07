import MSAMessaging from '@amicopo/msamessaging';
import fs from 'node:fs/promises';
import { join, relative, isAbsolute } from 'node:path';

const chrootPath = (chroot, path) => {
  path = join(chroot, path);

  // Check if within chroot. (https://stackoverflow.com/a/45242825/6362897)
  const rel = relative(chroot, path);
  if (rel && !rel.startsWith('..') && !isAbsolute(rel)) {
    throw new Error('Invalid path specified');
  }

  return path;
}

const io = new MSAMessaging();
io.register('write', async ({ input: { path, content } }, chroot, encoding='utf-8', forward) => {
  path = chrootPath(chroot, path);

  await fs.writeFile(path, content, {
    encoding: encoding
  });

  if (forward) {
    return content;
  }
});

io.register('read', async ({ input: { path } }, chroot, encoding='utf-8') => {
  path = chrootPath(chroot, path);

  const content = await fs.readFile(path, {
    encoding: encoding
  });

  return content;
});

io.start();
