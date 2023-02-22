import { Router } from 'express';
import yaml from 'js-yaml';

import conn from '../conn.js';
import Architecture from '../architecture.js';

const router = Router();

let archId = -1;
const architectures = {};

router.get('/all', (req, res) => {
  const view = {};
  for (const id in architectures) {
    view[id] = architectures[id].json();
  }
  res.json(view);
})

router.get('/:id', (req, res) => {
  res.json(architectures[req.params.id].json());
});

router.patch('/:id', async (req, res) => {
  const architecture = architectures[req.params.id];
  if (!architecture) { res.status(404).json('Architecture not found'); return; }

  if ('state' in req.body) {
    if (req.body.state === 0) {
      await architecture.delete();
    } else if (req.body.state === 1) {
      await architecture.create();
    } else {
      res.status(400).json('Unkown state given. Supply 0 or 1.');
      return;
    }
  }

  res.status(200).end();
});

router.post('/', (req, res) => {
  const arch = yaml.load(req.body.yaml); // TODO: Error handling
  const newId = ++archId;
  architectures[archId] = new Architecture(conn, newId, arch);

  res.json(archId);
})

export default router;
