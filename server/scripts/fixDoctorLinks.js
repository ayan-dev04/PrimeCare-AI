const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function fixCompletedApptDoctorLinks() {
  const atlasConn = await mongoose.createConnection(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 }).asPromise();
  const localConn = await mongoose.createConnection('mongodb://localhost:27017/test').asPromise();

  const appts = await atlasConn.db.collection('appointments').find({ status: 'completed' }).toArray();
  for (const a of appts) {
    const localDoc = await localConn.db.collection('doctors').findOne({ _id: a.doctor });
    if (localDoc) {
      const atlasDoc = await atlasConn.db.collection('doctors').findOne({ email: localDoc.email });
      if (atlasDoc) {
        console.log('Linking completed Token ' + a.tokenNumber + ' to Atlas Doctor ' + atlasDoc.name + ' (' + atlasDoc._id + ')');
        await atlasConn.db.collection('appointments').updateOne(
          { _id: a._id },
          { $set: { doctor: atlasDoc._id } }
        );
      }
    }
  }

  // Also verify revenue
  const { getAdminDashboardMetrics } = require('../controllers/adminController');
  let resData = null;
  await getAdminDashboardMetrics({}, { status() { return this; }, json(d) { resData = d; } });
  console.log('Recalculated Metrics Estimated Revenue:', resData?.metrics?.estimatedRevenue);

  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

fixCompletedApptDoctorLinks().catch(e => { console.error(e); process.exit(1); });
