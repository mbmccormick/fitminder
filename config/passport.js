var FitbitStrategy = require('passport-fitbit').Strategy;
var os = require('os');

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
            callbackURL: 'http://' + os.hostname() + ':' + port + '/auth/fitbit/callback'
        },
        function (token, tokenSecret, profile, done) {
            // asynchronous verification, for effect...
            process.nextTick(function () {

                // To keep the example simple, the user's Fitbit profile is returned to
                // represent the logged-in user.  In a typical application, you would want
                // to associate the Fitbit account with a user record in your database,
                // and return that user instead.
                return done(null, profile);
            });
        }
    ));

};