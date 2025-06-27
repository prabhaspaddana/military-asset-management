const mongoose = require('mongoose');

const assetSubSchema = new mongoose.Schema({
  asset: mongoose.Schema.Types.ObjectId,
  assetId: String,
  name: String,
  type: String,
  quantity: Number
}, { _id: false });

const transferSchema = new mongoose.Schema({
  assets: [assetSubSchema]
}, { collection: 'test_transfers' });

const TransferTest = mongoose.model('TransferTest', transferSchema);

async function run() {
  await mongoose.connect('mongodb://localhost:27017/military');
  await TransferTest.deleteMany({});
  await TransferTest.create({
    assets: [{
      asset: new mongoose.Types.ObjectId(),
      assetId: 'A-1001',
      name: 'Demo Vehicle 1',
      type: 'vehicle',
      quantity: 1
    }]
  });
  console.log('Success!');
  await mongoose.disconnect();
}

run().catch(err => { console.error('Minimal test error:', err); process.exit(1); });
