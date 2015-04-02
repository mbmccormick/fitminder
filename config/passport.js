var FitbitStrategy = require('passport-fitbit').Strategy;

var Profile = require('../app/models/profile');
var FitbitApiClient = require('fitbit-node');

module.exports = function(passport) {

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        Profile.findById(id, function(err, profile) {
            // log errors to console
            if (err) {
                console.log('ERROR: Profile.findById');
                console.log(err);
            }
            
            done(err, profile);
        });
    });

    passport.use(new FitbitStrategy({
            consumerKey: process.env.FITBIT_CONSUMER_KEY,
            consumerSecret: process.env.FITBIT_CONSUMER_SECRET,
            callbackURL: 'http://' + process.env.HOSTNAME + '/auth/fitbit/callback'
        },
        function(token, tokenSecret, profile, done) {
            process.nextTick(function() {

                // look up user's profile in database or create one if they don't exist
                Profile.findOrCreate({ encodedId: profile.id }, function(err, data, created) {
                    // log errors to console
                    if (err) {
                        console.log('ERROR: Profile.findOrCreate');
                        console.log(err);
                    }
                    
                    data.oauthToken = token;
                    data.oauthTokenSecret = tokenSecret;
                    data.fullName = profile._json.user.fullName;
                    data.nickname = profile._json.user.nickname || profile._json.user.fullName.split(' ')[0];
                    data.timezone = profile._json.user.timezone;
                    data.strideLengthWalking = profile._json.user.strideLengthWalking;
                    
                    // if this is a new user, set some additional defaults
                    if (created) {
                        data.phoneNumber = null;
                        data.isPhoneNumberVerified = false;
                        data.inactivityThreshold = 4; // 1 hour
                        data.startTime = 9; // 9:00 AM
                        data.endTime = 21; // 9:00 PM
                        data.dontSendRemindersAfterGoal = false;
                        data.lastSyncTime = null;
                        data.lastNotificationTime = null;
                    }
                    
                    data.save();
                
                    // connect to the fitbit api
                    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);
                    
                    // ensure that we have a subscription for this user
                    client.requestResource('/activities/apiSubscriptions/' + data.encodedId + '.json', 'POST', data.oauthToken, data.oauthTokenSecret).then(function(results) {
                        if (results[1].statusCode != 200 ||
                            results[1].statusCode != 201) {
                            // log errors to console
                            if (err) {
                                console.log('ERROR: FitbitApiClient.requestResource');
                                console.log(err);
                            }
                        }
                    });
                    
                    return done(null, data);
                });
            });
        }
    ));

};