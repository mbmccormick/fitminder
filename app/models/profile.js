var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');

var Schema = mongoose.Schema;

var ProfileSchema  = new Schema({
    encodedId: String,
    oauthToken: String,
    oauthTokenSecret: String,
    fullName: String,
    nickname: String,
    timezone: String,
    strideLengthWalking: Number,
    phoneNumber: String,
    isPhoneNumberVerified: Boolean,
    inactivityThreshold: Number,
    startTime: Number,
    endTime: Number,
    lastSyncTime: Date,
    lastNotificationTime: Date
});

ProfileSchema.plugin(findOrCreate);

module.exports = mongoose.model('Profile', ProfileSchema);
