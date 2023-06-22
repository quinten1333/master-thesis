import Pipelinemessaging from '@amicopo/pipelinemessaging';
import { MongoClient, ObjectId } from 'mongodb'

const io = new Pipelinemessaging();

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

const prepareSingleInput = (input: any) => {
  if (input._id) {
    input._id = new ObjectId(input._id);
  }

  return input;
}

const prepareMultipleInput = (input: any) => {
  if (input._id) {
    const op = Object.keys(input._id)[0];
    input._id[op] = input._id[op].map((id: string) => new ObjectId(id))
  }

  return input;
}

io.register('query', async ({ input }, args: { url: string, db: string, collection: string, one: boolean }) => {
  return await doOperation(args, async (col) => {
    if (args.one) {
      return await col.findOne(prepareSingleInput(input));
    }

    return await col.find(prepareMultipleInput(input)).toArray();
    });
});

io.register('update', async ({ input }: { input: { query: any, set: any } }, args: { url: string, db: string, collection: string, one: boolean }) => {
  return await doOperation(args, async (col) => {
    if (args.one) {
    return await col.updateOne(prepareSingleInput(input.query), input.set);
    }

    return await col.updateMany(prepareMultipleInput(input.query), input.set);
  });
});

io.register('delete', async ({ input }, args: { url: string, db: string, collection: string, one: boolean }) => {
  return await doOperation(args, async (col) => {
    if (args.one) {
      return await col.deleteOne(prepareSingleInput(input));
    }

    return await col.deleteMany(prepareMultipleInput(input));
  });
});

io.register('store', async ({ input }, args: { url: string, db: string, collection: string }) => {
  return await doOperation(args, async (col) => {
    return (await col.insertOne(prepareSingleInput(input))).insertedId;
  });
});

io.start();
