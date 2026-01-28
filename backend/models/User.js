const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['viewer', 'editor', 'admin'],
        default: 'viewer'
    },
    tenantId: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Method to check password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Pre-save hashing (optional if we do it in controller, but good practice here)
// However, since controller implementation already handles hashing, we verify this later.
// For now, let's keep the controller logic consistent and just define the schema.

const User = mongoose.model('User', userSchema);

module.exports = User;
