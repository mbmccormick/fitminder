var Profile = require('./models/profile');
var FitbitApiClient = require("fitbit-node");

module.exports = function (app, passport) {

    app.get('/', function (req, res) {

        res.render('index', { user: req.user });

    });

    app.get('/login', function (req, res) {

        res.render('login', { user: req.user });

    });

    app.get('/auth/fitbit', passport.authenticate('fitbit'), function (req, res) {

        // do nothing
        
    });

    app.get('/auth/fitbit/callback', passport.authenticate('fitbit', { failureRedirect: '/login' }), function (req, res) {

        res.redirect('/');

    });

    app.post('/api/payload', function (req, res) {

        // parse the incoming payload
        var json = JSON.parse(req.body);

        // process the individual notifications
        for (var update in json) {
            var query = Profile.where({ encodedId: update.ownerId });

            // find the user associated with this notification
            query.findOne(function (err, data) {
                if (data) {
                    // connect to the fitbit api
                    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);
                    
                    // fetch the user's activity timeseries data
                    client.requestResource('/activities/calories/date/today/1d/15min.json', 'GET', data.oauthToken, data.oauthTokenSecret).then(function (results) {
                        var response = results[0];
                        res.send(response);
                    });
                    
                    // TODO: process user's activity timeseries data

                    data.lastSyncTime = Date.now;

                    data.save();
                }
            });
        }

        // acknowledge the notification
        res.status(204);

    });

    app.get('/logout', function (req, res) {

        req.logout();
        res.redirect('/');

    });

};
