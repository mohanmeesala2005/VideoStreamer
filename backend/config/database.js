const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

const connectDB = async () => {
    try {
        let dbUrl = process.env.MONGODB_URI;

        // Try connecting to provided URI first
        if (dbUrl) {
            try {
                const conn = await mongoose.connect(dbUrl);
                console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
                return conn.connection;
            } catch (err) {
                console.log('⚠️ Failed to connect to configured MongoDB URI, falling back to in-memory server...');
            }
        }

        // Fallback to in-memory server
        mongod = await MongoMemoryServer.create();
        dbUrl = mongod.getUri();

        // Update env for other parts of app if needed
        process.env.MONGODB_URI = dbUrl;

        const conn = await mongoose.connect(dbUrl);
        console.log(`✅ In-Memory MongoDB Connected: ${conn.connection.host}`);
        console.log(`📝 Database URI: ${dbUrl}`);

        return conn.connection;
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
};

const disconnectDB = async () => {
    try {
        await mongoose.connection.close();
        if (mongod) {
            await mongod.stop();
        }
    } catch (err) {
        console.error(err);
    }
};

module.exports = { connectDB, disconnectDB };
