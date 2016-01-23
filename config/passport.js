var FitbitStrategy = require('passport-fitbit-oauth2').FitbitOAuth2Strategy;
var fitbit = require('../app/fitbit');

var moment = require('moment-timezone');

module.exports = function(Profile, passport) {

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        Profile.findById(id, function(err, data) {
            done(err, data);
        });
    });

    passport.use(new FitbitStrategy({
            clientID: process.env.FITBIT_CLIENT_ID,
            clientSecret: process.env.FITBIT_CLIENT_SECRET,
            callbackURL: 'http://' + process.env.HOSTNAME + '/auth/fitbit/callback'
        },
        function(accessToken, refreshToken, profile, done) {
            // look up user's profile in database or create one if they don't exist
            Profile.findOrCreate(profile.id, function(err, data, created) {
                if (err) {
                    return done(err);
                }

                data.oauthAccessToken = accessToken;
                data.oauthRefreshToken = refreshToken;
                data.fullName = profile._json.user.fullName;
                data.nickname = profile._json.user.nickname || profile._json.user.fullName.split(' ')[0];
                data.timezone = profile._json.user.timezone;
                data.strideLengthWalking = profile._json.user.strideLengthWalking;

                // if this is a new user, set some additional defaults
                if (created) {
                    console.log('Creating user account for ' + profile.id);

                    data.phoneNumber = null;
                    data.isPhoneNumberVerified = false;
                    data.inactivityThreshold = 4; // 1 hour
                    data.startTime = 9; // 9:00 AM
                    data.endTime = 21; // 9:00 PM
                    data.dontSendRemindersAfterGoal = false;
                    data.lastSyncTime = null;
                    data.lastNotificationTime = null;
                    data.expirationDate = moment().utc().add(2, 'weeks'); // 2 week free trial
                } else {
                    console.log('New dashboard session for ' + profile.id);
                }

                Profile.update(data);

                // create a subscription for the user
                fitbit.createSubscription(Profile, data, done);

                return done(null, data);
            });
        }
    ));

};
