var mongoose = require('mongoose');

module.exports = mongoose.model('Profile', {
    encodedId: String,
    oauthToken: String,
    oauthTokenSecret: String,
    fullName: String,
    timezone: String,
    strideLengthWalking: Number,
    phoneNumber: String,
    isPhoneNumberVerified: Boolean,
    lastSyncTime: Date,
    lastNotificationTime: Date
});
