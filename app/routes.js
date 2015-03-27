var Profile = require('./models/profile');
var FitbitApiClient = require('fitbit-node');
var TwilioApiClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

module.exports = function(app, passport) {

    app.get('/', function(req, res) {

        res.render('index', { user: req.user });

    });

    app.get('/login', function(req, res) {

        res.render('login', { user: req.user });

    });

    app.get('/auth/fitbit', passport.authenticate('fitbit'), function(req, res) {

        // do nothing
        
    });

    app.get('/auth/fitbit/callback', passport.authenticate('fitbit', { failureRedirect: '/login' }), function(req, res) {

        res.redirect('/profile');

    });
    
    app.get('/profile', ensureAuthenticated, function(req, res) {

        res.render('profile', { user: req.user });

    });
    
    app.post('/profile', ensureAuthenticated, function(req, res) {

        var query = Profile.where({ encodedId: req.user.encodedId });

        // find the current user's profile
        query.findOne(function(err, data) {            
            // log errors to console
            if (err) {
                console.log('ERROR: Profile.where.findOne');
                console.log(err);
            }
            
            // check to see if they are changing their phone number
            if (data.phoneNumber != req.body.phoneNumber) {
                data.phoneNumber = (req.body.phoneNumber.indexOf('+1', 0) === 0 ? req.body.phoneNumber : '+1' + req.body.phoneNumber);
                data.isPhoneNumberVerified = false;
                
                data.save();
                
                // send a text message to confirm the phone number
                TwilioApiClient.sendMessage({
                        to: data.phoneNumber,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        body: 'Hey, ' + data.nickname + '! Thanks for signing up for Fitminder. Please reply \"yes\" to confirm your phone number.'
                    }, function(err, responseData) { 
                        // log errors to console
                        if (err) {
                            console.log('ERROR: TwilioApiClient.sendMessage');
                            console.log(err);
                        }
                    }
                );
            }
            
            // update the user's profile currently stored in session
            req.user = data;
        
            res.render('profile', { user: req.user });
        });

    });
    
    app.post('/api/twilio/inbound', function(req, res) {

        var query = Profile.where({ phoneNumber: (req.body.From.indexOf('+1', 0) === 0 ? req.body.From : '+1' + req.body.From) });

        // find the user profile associated with this phone number
        query.findOne(function(err, data) {            
            // log errors to console
            if (err) {
                console.log('ERROR: Profile.where.findOne');
                console.log(err);
            }
            
            // check to see if they correctly verified their number
            if (req.body.Body.trim().toUpperCase() == 'YES') {
                data.isPhoneNumberVerified = true;
                
                data.save();
                
                // send a text message to confirm receipt
                TwilioApiClient.sendMessage({
                        to: data.phoneNumber,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        body: 'Awesome. Your phone number has been verified!'
                    }, function(err, responseData) {
                        // log errors to console
                        if (err) {
                            console.log('ERROR: TwilioApiClient.sendMessage');
                            console.log(err);
                        }
                    }
                );
            }
        });

        // acknowledge the request
        res.status(200).end();

    });

    app.post('/api/fitbit/notification', function(req, res) {

        // process the individual notifications
        for (var i = 0; i < req.body.length; i++) {
            var query = Profile.where({ encodedId: req.body[i].ownerId });

            // find the user associated with this notification
            query.findOne(function(err, data) {
                // log errors to console
                if (err) {
                    console.log('ERROR: Profile.where.findOne');
                    console.log(err);
                }
                
                data.lastSyncTime = Date.now();

                data.save();
                
                // check if phone number is verified and last notification was sent at least 2 hours ago
                if (data.isPhoneNumberVerified &&
                    data.lastNotificationTime < (Date.now() - (4 * 60 * 60))) {
                    // connect to the fitbit api
                    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);
                        
                    // fetch the user's activity timeseries data
                    client.requestResource('/activities/calories/date/today/1d/15min.json', 'GET', data.oauthToken, data.oauthTokenSecret).then(function(results) {
                        if (results[1].statusCode != 200) {
                            // log errors to console
                            if (err) {
                                console.log('ERROR: FitbitApiClient.requestResource');
                                console.log(err);
                            }
                        }
                        
                        var payload = JSON.parse(results[0]);
                        
                        var sedentaryCount = 0;
                        
                        // loop through the timeseries data to find when how long user has been sedentary
                        for (var j = payload['activities-calories-intraday'].dataset.length - 1; j >= 0; j--) {
                            if (payload['activities-calories-intraday'].dataset[j].level == 0) {
                                sedentaryCount++;
                            } else {
                                break;
                            }
                        }
                        
                        // check if user has been sedentary for at least 45 minutes
                        if (sedentaryCount > 3) {
                            var messages = [
								'Get moving, ' + data.nickname + '! Time to go for a walk.',
								'Get moving, ' + data.nickname + '! You\'ve been sedentary for quite a while.',
								'Wake up, ' + data.nickname + '! Time to go for a walk.',
								'Wake up, ' + data.nickname + '! You\'ve been sedentary for quite a while.'
							];
							
							var index = Math.floor((Math.random() * messages.length));
							var message = messages[index];
                            
                            // send a text message to notify the user
                            TwilioApiClient.sendMessage({
                                    to: data.phoneNumber,
                                    from: process.env.TWILIO_PHONE_NUMBER,
                                    body: message
                                }, function(err, responseData) {
                                    // log errors to console
                                    if (err) {
                                        console.log('ERROR: TwilioApiClient.sendMessage');
                                        console.log(err);
                                    }
                                }
                            );
                            
                            data.lastNotificationTime = Date.now();

                            data.save();
                        }
                    });
                }
            });
        }

        // acknowledge the notification
        res.status(204).end();

    });

    app.get('/logout', function(req, res) {

        req.logout();
        res.redirect('/');

    });

};

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    
    res.redirect('/login')
}
