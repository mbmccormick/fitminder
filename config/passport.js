var FitbitStrategy = require('passport-fitbit').Strategy;
var Profile = require('../app/models/profile');

module.exports = function (passport, port) {

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

                var query = Profile.where({ encodedId: profile._json.user.encodedId });

                query.findOne(function (err, data) {
                    if (data) {
                        data.fullName = profile._json.user.fullName;
                        data.timezone = profile._json.user.timezone;
                        data.strideLengthWalking = profile._json.user.strideLengthWalking;

                        data.save();

                        return done(null, data);
                    } else {
                        var insert = new Profile({
                            encodedId: profile._json.user.encodedId,
                            oauthToken: token,
                            oauthTokenSecret: tokenSecret,
                            fullName: profile._json.user.fullName,
                            timezone: profile._json.user.timezone,
                            strideLengthWalking: profile._json.user.strideLengthWalking,
                            phoneNumber: null,
                            isPhoneNumberVerified: false,
                            lastSyncTime: null,
                            lastNotificationTime: null
                        });

                        insert.save();

                        return done(null, insert);
                    }
                });
            });
        }
    ));

};