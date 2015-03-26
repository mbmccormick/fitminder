var FitbitStrategy = require('passport-fitbit').Strategy;

var Profile = require('../app/models/profile');
var FitbitApiClient = require('fitbit-node');

module.exports = function (passport) {

    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(function (obj, done) {
        done(null, obj);
    });

    passport.use(new FitbitStrategy({
            consumerKey: process.env.FITBIT_CONSUMER_KEY,
            consumerSecret: process.env.FITBIT_CONSUMER_SECRET,
            callbackURL: 'http://' + process.env.HOSTNAME + '/auth/fitbit/callback'
        },
        function (token, tokenSecret, profile, done) {
            process.nextTick(function () {

                // look up user's profile in database or create one if they don't exist
                Profile.findOrCreate({ encodedId: profile.id }, function (err, data, created) {
                    data.oauthToken = token;
                    data.oauthTokenSecret = tokenSecret;
                    data.fullName = profile._json.user.fullName;
                    data.timezone = profile._json.user.timezone;
                    data.strideLengthWalking = profile._json.user.strideLengthWalking;
                    
                    // if this is a new user, set some additional defaults
                    if (created) {
                        data.phoneNumber = null;
                        data.isPhoneNumberVerified = false;
                        data.lastSyncTime = null;
                        data.lastNotificationTime = null;
                    }
                    
                    data.save();
                
                    // connect to the fitbit api
                    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);
                    
                    // ensure that we have a subscription for this user
                    client.requestResource('/activities/apiSubscriptions/' + data.encodedId + '.json', 'POST', data.oauthToken, data.oauthTokenSecret).then(function (results) {
                        var response = results[0];
                        res.send(response);
                    });
                    
                    return done(null, data);
                });
            });
        }
    ));

};