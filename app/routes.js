var Profile = require('./models/profile');
var FitbitApiClient = require('fitbit-node');
var TwilioApiClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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

        res.redirect('/profile');

    });
    
    app.get('/profile', function (req, res) {

        res.render('profile', { user: req.user });

    });
    
    app.post('/profile', function (req, res) {

        var query = Profile.where({ encodedId: update.ownerId });

        // find the current user's profile
        query.findOne(function (err, data) {            
            
            // check to see if they are changing their phone number
            if (data.phoneNumber != req.body.phoneNumber) {
                data.phoneNumber = req.body.phoneNumber;
                data.isPhoneNumberVerified = false;
                
                data.save();
                
                // send a text message to confirm the phone number
                TwilioApiClient.sendMessage({
                        to: data.phoneNumber,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        body: 'Hey, ' + data.fullName + '! Thanks for signing up for Fitminder. Please reply \"yes\" to confirm your phone number.'
                    }, function (err, responseData) { 
                        
                        // TODO: add error handling
                    
                    }
                );
            }
        });
        
        res.render('profile', { user: req.user });

    });
    
    app.post('/api/twilio/inbound', function (req, res) {
    
        // TODO: process phone number verification

    });

    app.post('/api/fitbit/notification', function (req, res) {

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
