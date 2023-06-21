import Pipelinemessaging from '@amicopo/pipelinemessaging';
import { MongoClient, ObjectId } from 'mongodb'

const io = new Pipelinemessaging();

const connect = async (args: { url: string, db: string, collection: string }) => {
  const client = new MongoClient(args.url);
  await client.connect();

  const db = client.db(args.db);
  const col = db.collection(args.collection);

  return { client, db, col };
}


io.register('query', async ({ input }, args: { condition: any, url: string, db: string, collection: string, one: boolean }) => {
  const { client, col } = await connect(args);

  let res: any;
  if (args.one) {
    if (input._id) {
      input._id = new ObjectId(input._id);
    }

    res = await col.findOne(input);
  } else {
    if (input._id) {
      const op = Object.keys(input._id)[0];
      input._id[op] = input._id[op].map((id: string) => new ObjectId(id))
    }

    res = await col.find(input).toArray();
  }

  await client.close();

  return res;
});

io.register('store', async ({ input }, args: { url: string, db: string, collection: string }) => {
  const { client, col } = await connect(args);

  const res = await col.insertOne(input);

  await client.close();

  return res.insertedId;
});

io.start();
