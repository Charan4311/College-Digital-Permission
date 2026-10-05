const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    const requests = await db.collection('outpassrequests').find({ documentUrl: { $exists: true, $ne: null } }).toArray();
    console.log('Total documents with documentUrl:', requests.length);
    const fs = require('fs');
    let missingCount = 0;
    requests.forEach(r => {
        const filePath = 'd:/Downloads/College-Digital-Permission_UPDATED/College-Digital-Permission/backend' + r.documentUrl;
        if(!fs.existsSync(filePath)) {
            console.log('Missing:', r.documentUrl);
            missingCount++;
        }
    });
    console.log('Total missing files:', missingCount);
    process.exit(0);
});
