import MSAMessaging from '@amicopo/msamessaging';
import { MongoClient } from 'mongodb'

const io = new MSAMessaging();

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
    res = await col.findOne(input);
  } else {
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
