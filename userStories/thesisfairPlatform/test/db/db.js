import bcrypt from 'bcrypt';

import { MongoDBProvisioner } from '../mongodbprovisioner/index.js';

const saltRounds = 0;
const hashCache = {};
const hash = async (password) => {
  if (hashCache[password]) {
    return hashCache[password];
  }

  return (hashCache[password] = await bcrypt.hash(password, saltRounds))
};

const configs = {
  entities: {
    uri: process.env.mongodbConStrEntity || 'mongodb://localhost:27017/entity_service',
    library: import('./entity.js'),
    object: 'Entity',
    get: (db) => [
      {
        name: 'New name1 - entity',
        description: 'New description1 - entity',
        type: 'company',
        contact: [{ type: 'website', content: 'qrcsoftware.nl/1' }, { type: 'email', content: 'info.1@uva.nl' }, { type: 'phonenumber', content: '06 12345671' }],
        external_id: 0,
        representatives: 2,
        location: 'Booth 1'
      },
      {
        name: 'New name 2',
        description: 'New description 2',
        type: 'research',
        contact: [{ type: 'website', content: 'qrcsoftware.nl/2' }, { type: 'email', content: 'info.2@uva.nl' }, { type: 'phonenumber', content: '06 12345672' }],
        external_id: 1,
        representatives: 2,
        location: 'Booth 2'
      },
      {
        name: 'New name 3',
        description: 'New description 3',
        type: 'company',
        contact: [{ type: 'website', content: 'qrcsoftware.nl/3' }, { type: 'email', content: 'info.3@uva.nl' }, { type: 'phonenumber', content: '06 12345673' }],
        external_id: 2,
        representatives: 3,
        location: 'Booth 3'
      },
      {
        name: 'New name 4',
        description: 'New description 4',
        type: 'company',
        contact: [{ type: 'website', content: 'qrcsoftware.nl/4' }, { type: 'email', content: 'info.4@uva.nl' }, { type: 'phonenumber', content: '06 12345674' }],
        external_id: 3,
        representatives: 4,
        location: 'Booth 4'
      }
    ],
  },
  users: {
    uri: process.env.mongodbConStrUser || 'mongodb://localhost:27017/user_service',
    library: import('./user.js'),
    object: 'User',
    objects: ['User', 'Student', 'Representative'],
    hide: ['password'],
    get: async (db) => [
      {
        firstname: 'Quinten',
        lastname: 'Coltof',
        email: 'student',
        password: await hash('student'),
        phone: '+31 6 01234567',
        studentnumber: '12345678',
        websites: ['https://qrcsoftware.nl', 'https://softwareify.nl'],
        studies: ['UvA Informatica'],
        share: [db.entities[0].enid, db.entities[2].enid],
        manuallyShared: [db.entities[0].enid, db.entities[2].enid],
        __t: "Student",
      },
      {
        firstname: 'Johannes',
        lastname: 'Sebastiaan',
        email: 'johannes.sebastiaan@gmail.com',
        phone: '+31 6 11234567',
        studentnumber: '22345678',
        websites: ['https://johannes.nl', 'https://sebastiaan.nl'],
        studies: ['UvA Kunstmatige Intellegentie', 'VU Rechten'],
        share: [db.entities[0].enid, db.entities[1].enid],
        manuallyShared: [db.entities[0].enid],
        __t: "Student",
      },
      {
        firstname: 'John',
        lastname: 'de jonge',
        email: 'rep',
        phone: '+31 6 21234567',
        enid: db.entities[0].enid,
        password: await hash('rep'),
        repAdmin: false,
        __t: "Representative",
      },
      {
        firstname: 'Edsger',
        lastname: 'Dijkstra',
        email: 'repAdmin',
        phone: '+31 6 31234567',
        enid: db.entities[0].enid,
        password: await hash('repAdmin'),
        repAdmin: true,
        __t: "Representative",
      },
      {
        firstname: 'Eduard',
        lastname: 'Dijkstra',
        email: 'Eduard.d@uva.com',
        phone: '+31 6 41234567',
        enid: db.entities[1].enid,
        password: await hash('helloWorld!'),
        repAdmin: false,
        __t: "Representative",
      },
      {
        email: 'admin',
        password: await hash('admin'),
        admin: true,
      },
      {
        firstname: 'Private',
        lastname: 'Student',
        email: 'private@gmail.com',
        phone: '+31 6 11134567',
        studentnumber: '22245678',
        websites: [],
        studies: ['UvA Kunstmatige Intellegentie',],
        share: [],
        manuallyShared: [],
        __t: "Student",
      },
    ],
  },
};

const provisioner = new MongoDBProvisioner(configs);

export let db;
export let models;
export const init = provisioner.init;
const main = async () => {
  await provisioner.provision();
  db = provisioner.db;
  models = provisioner.models;
}
export default main;
export const disconnect = provisioner.disconnect;

if (process.argv.length === 3 && process.argv[2] === 'run') {
  console.log('Initializing database from cli');
  init().then(main).then(disconnect);
}
