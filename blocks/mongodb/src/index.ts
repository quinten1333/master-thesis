import Pipelinemessaging from '@amicopo/pipelinemessaging';
import { MongoClient, ObjectId } from 'mongodb'

const io = new Pipelinemessaging();

io.registerType('ObjectId', (id: string) => new ObjectId(id));

type connectArgs = {
  url: string
  db: string
  collection: string
}

const connect = async (args: connectArgs) => {
  const client = new MongoClient(args.url);
  await client.connect();

  const db = client.db(args.db);
  const col = db.collection(args.collection);

  return { client, db, col };
}

async function doOperation(args: connectArgs, op: (col: any) => Promise<any>) {
  const { client, col } = await connect(args);
  const res = await op(col);
  await client.close();
  return res;
}

io.register('query', async ({ input }, args: { url: string, db: string, collection: string, one: boolean }) => {
  return await doOperation(args, async (col) => {
    if (args.one) {
      return await col.findOne(input);
    }

    return await col.find(input).toArray();
    });
});

io.register('update', async ({ input }: { input: { query: any, set: any } }, args: { url: string, db: string, collection: string, one: boolean }) => {
  return await doOperation(args, async (col) => {
    if (args.one) {
    return await col.updateOne(input.query, input.set);
    }

    return await col.updateMany(input.query, input.set);
  });
});

io.register('delete', async ({ input }, args: { url: string, db: string, collection: string, one: boolean }) => {
  return await doOperation(args, async (col) => {
    if (args.one) {
      return await col.deleteOne(input);
    }

    return await col.deleteMany(input);
  });
});

io.register('store', async ({ input }, args: { url: string, db: string, collection: string }) => {
  return await doOperation(args, async (col) => {
    return (await col.insertOne(input)).insertedId;
  });
});

io.start();
