require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Base = require('./models/Base');
const Asset = require('./models/Asset');
const Purchase = require('./models/Purchase');
const Transfer2 = require('./models/Transfer');
const Assignment = require('./models/Assignment');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/military';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  console.log('Mongoose connection db name:', mongoose.connection.name);

  // Clear existing demo data
  await Promise.all([
    User.deleteMany({ email: /@demo.com$/ }),
    Base.deleteMany({ name: /Demo Base/ }),
    Asset.deleteMany({ name: /Demo/ }),
    Purchase.deleteMany({ notes: /Demo/ }),
    Transfer2.deleteMany({ notes: /Demo/ }),
    Assignment.deleteMany({ notes: /Demo/ })
  ]);
  console.log('Cleared old demo data');

  // Create users first
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@demo.com',
    password: await bcrypt.hash('password', 10),
    role: 'admin',
    rank: 'Colonel',
    department: 'HQ',
    status: 'active'
  });
  console.log('Created admin user');
  const commander = await User.create({
    name: 'Commander User',
    email: 'commander@demo.com',
    password: await bcrypt.hash('password', 10),
    role: 'commander',
    rank: 'Major',
    department: 'Command',
    status: 'active'
  });
  console.log('Created commander user');
  const officer = await User.create({
    name: 'Officer User',
    email: 'officer@demo.com',
    password: await bcrypt.hash('password', 10),
    role: 'officer',
    rank: 'Lieutenant',
    department: 'Logistics',
    status: 'active'
  });
  console.log('Created officer user');

  // Now create bases with commander field set
  const base1 = await Base.create({
    name: 'Demo Base Alpha',
    location: { city: 'Alpha City', state: 'Alpha State', country: 'CountryA' },
    commander: commander._id,
    status: 'active'
  });
  console.log('Created base1');
  const base2 = await Base.create({
    name: 'Demo Base Bravo',
    location: { city: 'Bravo City', state: 'Bravo State', country: 'CountryA' },
    commander: officer._id,
    status: 'active'
  });
  console.log('Created base2');

  // Update users with base assignment
  admin.base = base1._id;
  commander.base = base1._id;
  officer.base = base2._id;
  await admin.save();
  await commander.save();
  await officer.save();
  console.log('Updated users with base assignments');

  // Create assets
  const asset1 = await Asset.create({
    assetId: 'A-1001',
    name: 'Demo Vehicle 1',
    type: 'vehicle',
    category: 'Transport',
    specifications: { model: 'Jeep', manufacturer: 'AutoCorp', year: 2020 },
    currentBase: base1._id,
    status: 'available'
  });
  console.log('Created asset1');
  const asset2 = await Asset.create({
    assetId: 'A-2001',
    name: 'Demo Weapon 1',
    type: 'weapon',
    category: 'Rifle',
    specifications: { model: 'M16', manufacturer: 'GunMakers', year: 2018 },
    currentBase: base2._id,
    status: 'available'
  });
  console.log('Created asset2');

  // Create a purchase
  await Purchase.create({
    purchaseId: 'PO-0001',
    base: base1._id,
    items: [{
      assetType: 'vehicle',
      category: 'Transport',
      name: 'Demo Vehicle 1',
      quantity: 2,
      unitCost: 50000,
      totalCost: 100000
    }],
    supplier: { name: 'Demo Supplier', contact: { email: 'supplier@demo.com' } },
    purchaseOrder: { number: 'PO-0001', date: new Date(), approvedBy: admin._id },
    totalAmount: 100000,
    status: 'received',
    notes: 'Demo purchase for seeding'
  });
  console.log('Created purchase');

  // Create a transfer
  await Transfer2.create({
    transferId: 'T-0001',
    fromBase: base1._id,
    toBase: base2._id,
    assets: [{ asset: asset1._id, assetId: asset1.assetId, name: asset1.name, type: asset1.type, quantity: 1 }],
    requestedBy: commander._id,
    approvedBy: admin._id,
    status: 'completed',
    priority: 'medium',
    transportDetails: { method: 'ground' },
    reason: 'Demo transfer',
    notes: 'Demo transfer for seeding'
  });
  console.log('Created transfer');

  // Create an assignment
  await Assignment.create({
    assignmentId: 'AS-0001',
    asset: asset2._id,
    assignedTo: officer._id,
    assignedBy: commander._id,
    base: base2._id,
    assignmentDate: new Date(),
    expectedReturnDate: null,
    purpose: 'Demo assignment',
    mission: 'Demo mission',
    condition: { assigned: 'good' },
    notes: 'Demo assignment for seeding',
    status: 'active'
  });
  console.log('Created assignment');

  console.log('Users count:', await User.countDocuments());
  console.log('Bases count:', await Base.countDocuments());
  console.log('Assets count:', await Asset.countDocuments());
  console.log('Purchases count:', await Purchase.countDocuments());
  console.log('Transfers2 count:', await Transfer2.countDocuments());
  console.log('Assignments count:', await Assignment.countDocuments());

  console.log('Demo data seeded!');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); }); 