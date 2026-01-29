const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function makeAdmin() {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('Missing MONGODB_URI in environment. Set it in .env');
            process.exit(1);
        }

        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        console.log('MongoDB connected');

        const email = process.argv[2];
        if (!email) {
            console.log('\nUsage: node makeAdmin.js <user-email>');
            process.exit(1);
        }

        const user = await User.findOneAndUpdate(
            { email: email },
            { role: 'admin' },
            { new: true }
        );

        if (!user) {
            console.log(`\nUser with email "${email}" not found`);
            console.log('Please make sure the user exists in the database.\n');
            await mongoose.disconnect();
            process.exit(1);
        }

        console.log('\nUser successfully promoted to admin!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('User Details:');
        console.log(`  Name:     ${user.name || 'N/A'}`);
        console.log(`  Email:    ${user.email}`);
        console.log(`  Role:     ${user.role}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\nIMPORTANT: The user must LOG OUT and LOG IN again');
        console.log('for the admin role to take effect!\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('\nError:', error.message || error);
        try { await mongoose.disconnect(); } catch (e) {}
        process.exit(1);
    }
}

makeAdmin();