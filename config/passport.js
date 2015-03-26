var FitbitStrategy = require('passport-fitbit').Strategy;

module.exports = function (passport, port) {

    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(function (obj, done) {
        done(null, obj);
    });

    passport.use(new FitbitStrategy({
            consumerKey: "e725b07ba46547e7b0d03d46ea8f0098",
            consumerSecret: "73f8946f63b2481c86fb73f6a4a56694",
            callbackURL: "http://127.0.0.1:" + port + "/auth/fitbit/callback"
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