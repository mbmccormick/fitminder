var Profile = require('./models/profile');
var FitbitApiClient = require('fitbit-node');
var TwilioApiClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
var phone = require('phone');
var moment = require('moment-timezone');

module.exports = function(app, passport) {

    app.get('/', function(req, res) {

        res.render('index', { user: req.user });

    });

    app.get('/auth/fitbit', passport.authenticate('fitbit'), function(req, res) {

        // do nothing
        
    });

    app.get('/auth/fitbit/callback', passport.authenticate('fitbit', { failureRedirect: '/login' }), function(req, res) {

        res.redirect('/profile');

    });
    
    app.get('/profile', ensureAuthenticated, function(req, res) {

        if (req.user.phoneNumber != null) {
            res.render('profile', { user: req.user });
        } else {
            res.redirect('/profile/landing');
        }

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
            
            var phoneNumber = phone(req.body.phoneNumber, 'USA');
            if (phoneNumber == null) {
                // TODO: handle phone number validation failure
            }
            
            // check to see if they are changing their phone number
            if (data.phoneNumber != phoneNumber[0]) {
                data.phoneNumber = phoneNumber[0];
                data.isPhoneNumberVerified = false;
                
                data.save();
                
                // send a text message to confirm the phone number
                TwilioApiClient.sendMessage({
                        to: data.phoneNumber,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        body: 'Hey, ' + data.nickname + '! Thanks for updating your phone number with Fitminder. Please reply \"yes\" to confirm your new number.'
                    }, function(err, responseData) { 
                        // log errors to console
                        if (err) {
                            console.log('ERROR: TwilioApiClient.sendMessage');
                            console.log(err);
                        }
                    }
                );
            }
            
            data.inactivityThreshold = req.body.inactivityThreshold;
            data.startTime = req.body.startTime;
            data.endTime = req.body.endTime;
            data.dontSendRemindersAfterGoal = req.body.dontSendRemindersAfterGoal ? true : false;
            
            data.save();
            
            // update the user's profile currently stored in session
            req.user = data;
        
            res.render('profile', { user: req.user });
        });

    });
    
    app.get('/profile/delete', ensureAuthenticated, function (req, res) {

        var query = Profile.where({ encodedId: req.user.encodedId });

        // find the current user's profile
        query.findOne(function(err, data) {            
            // log errors to console
            if (err) {
                console.log('ERROR: Profile.where.findOne');
                console.log(err);
            }
            
            // connect to the fitbit api
            var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);
            
            // delete the subscription for this user
            client.requestResource('/activities/apiSubscriptions/' + data.encodedId + '.json', 'DELETE', data.oauthToken, data.oauthTokenSecret).then(function(results) {
                if (results[1].statusCode != 204 ||
                    results[1].statusCode != 404) {
                    // log errors to console
                    if (err) {
                        console.log('ERROR: FitbitApiClient.requestResource');
                        console.log(err);
                    }
                }
            });
            
            data.remove();
        });
        
        req.logout();
        res.redirect('/');

    });

    app.get('/profile/landing', ensureAuthenticated, function (req, res) {

        res.render('landing', { user: req.user });

    });

    app.post('/profile/landing', ensureAuthenticated, function (req, res) {

        var query = Profile.where({ encodedId: req.user.encodedId });

        // find the current user's profile
        query.findOne(function (err, data) {
            // log errors to console
            if (err) {
                console.log('ERROR: Profile.where.findOne');
                console.log(err);
            }
            
            var phoneNumber = phone(req.body.phoneNumber, 'USA');
            if (phoneNumber == null) {
                // TODO: handle phone number validation failure
            }

            // check to see if they are changing their phone number
            if (data.phoneNumber != req.body.phoneNumber) {
                data.phoneNumber = phoneNumber[0];
                data.isPhoneNumberVerified = false;

                data.save();

                // send a text message to confirm the phone number
                TwilioApiClient.sendMessage({
                        to: data.phoneNumber,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        body: 'Hey, ' + data.nickname + '! Thanks for signing up for Fitminder. Please reply \"yes\" to confirm your phone number.'
                    }, function (err, responseData) {
                        // log errors to console
                        if (err) {
                            console.log('ERROR: TwilioApiClient.sendMessage');
                            console.log(err);
                        }
                    }
                );
            }
            
            data.inactivityThreshold = req.body.inactivityThreshold;
            data.startTime = req.body.startTime;
            data.endTime = req.body.endTime;
            data.dontSendRemindersAfterGoal = req.body.dontSendRemindersAfterGoal ? true : false;
            
            data.save();

            // update the user's profile currently stored in session
            req.user = data;

            res.render('landing', { user: req.user });
        });

    });
    
    app.post('/api/twilio/inbound', function(req, res) {

        var phoneNumber = phone(req.body.From, 'USA');
        if (phoneNumber == null) {
            // TODO: handle phone number validation failure
        }
        
        var query = Profile.where({ phoneNumber: phoneNumber[0] });

        // find the user profile associated with this phone number
        query.findOne(function(err, data) {            
            // log errors to console
            if (err) {
                console.log('ERROR: Profile.where.findOne');
                console.log(err);
            }
            
            // check to see if we found a user
            if (data) {
                // check to see if they correctly verified their number
                if (req.body.Body.trim().toLowerCase() == 'yes') {
                    data.isPhoneNumberVerified = true;
                    
                    data.save();
                    
                    // send a text message to confirm number verification
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
                } else {
                    // send a text message to confirm receipt
                    TwilioApiClient.sendMessage({
                            to: phoneNumber[0],
                            from: process.env.TWILIO_PHONE_NUMBER,
                            body: 'Hey there! We didn\'t understand your text message. For more information, please visit http://' + process.env.HOSTNAME + '.'
                        }, function(err, responseData) {
                            // log errors to console
                            if (err) {
                                console.log('ERROR: TwilioApiClient.sendMessage');
                                console.log(err);
                            }
                        }
                    );
                }
            } else {
                // send a text message to confirm receipt
                TwilioApiClient.sendMessage({
                        to: phoneNumber[0],
                        from: process.env.TWILIO_PHONE_NUMBER,
                        body: 'Hey there! We didn\'t understand your text message. For more information, please visit http://' + process.env.HOSTNAME + '.'
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
                
                data.lastSyncTime = moment.utc();

                data.save();

                // check the last notification time and see if we are inside the user's reminder window
                if (data.lastNotificationTime < moment.utc().subtract(data.inactivityThreshold * 15, 'minutes') &&
                    moment.utc().tz(data.timezone).hour() >= data.startTime &&
                    moment.utc().tz(data.timezone).hour() < data.endTime) {                
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
                    
                        // check if user has been sedentary for the last 45 minutes
                        if (sedentaryCount > data.inactivityThreshold) {
                            // check if we need to check for the user's step goal
                            if (data.dontSendRemindersAfterGoal) {
                                // fetch the user's stats for today
                                client.requestResource('/activities/date/today.json', 'GET', data.oauthToken, data.oauthTokenSecret).then(function(results) {
                                    if (results[1].statusCode != 200) {
                                        // log errors to console
                                        if (err) {
                                            console.log('ERROR: FitbitApiClient.requestResource');
                                            console.log(err);
                                        }
                                    }
                                
                                    var payload = JSON.parse(results[0]);
                                    
                                    // check if user has met step goal for today
                                    if (payload.summary.steps < payload.goals.step) {
                                        var messages = [
                                            'Get up and move, ' + data.nickname + '! Why not go for a short walk?',
                                            'Get up and move, ' + data.nickname + '! Go for a short walk and score a few hundred steps.',
                                            'Get up and move, ' + data.nickname + '! It\'s time to go for a walk.',
                                            'Get up and move, ' + data.nickname + '! You\'ve been inactive for quite a while.',
                                            'Hey, ' + data.nickname + '! Why not go for a short walk?',
                                            'Hey, ' + data.nickname + '! Get off your butt and get some steps!',
                                            'Hey, ' + data.nickname + '! Go for a short walk and score a few hundred steps.',
                                            'Hey, ' + data.nickname + '! It\'s time to go for a walk.',
                                            'Hey, ' + data.nickname + '! You\'ve been inactive for quite a while.',
                                            'Knock knock, ' + data.nickname + '! Why not go for a short walk?',
                                            'Knock knock, ' + data.nickname + '! Get off your butt and get some steps!',
                                            'Knock knock, ' + data.nickname + '! Go for a short walk and score a few hundred steps.',
                                            'Knock knock, ' + data.nickname + '! It\'s time to go for a walk.',
                                            'Knock knock, ' + data.nickname + '! You\'ve been inactive for quite a while.',
                                            'Wake up, ' + data.nickname + '! Why not go for a short walk?',
                                            'Wake up, ' + data.nickname + '! Get off your butt and get some steps!',
                                            'Wake up, ' + data.nickname + '! Go for a short walk and score a few hundred steps.',
                                            'Wake up, ' + data.nickname + '! It\'s time to go for a walk.',
                                            'Wake up, ' + data.nickname + '! You\'ve been inactive for quite a while.',
                                        ];
                                    
                                        var index = Math.floor((Math.random() * messages.length));
                                        var message = messages[index];
                                    
                                        // check if phone number is verified
                                        if (data.isPhoneNumberVerified) {
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
                                        
                                            data.lastNotificationTime = moment.utc();

                                            data.save();
                                        }
                                    }
                                });
                            } else {
                                var messages = [
                                    'Get up and move, ' + data.nickname + '! Why not go for a short walk?',
                                    'Get up and move, ' + data.nickname + '! Go for a short walk and score a few hundred steps.',
                                    'Get up and move, ' + data.nickname + '! It\'s time to go for a walk.',
                                    'Get up and move, ' + data.nickname + '! You\'ve been inactive for quite a while.',
                                    'Hey, ' + data.nickname + '! Why not go for a short walk?',
                                    'Hey, ' + data.nickname + '! Get off your butt and get some steps!',
                                    'Hey, ' + data.nickname + '! Go for a short walk and score a few hundred steps.',
                                    'Hey, ' + data.nickname + '! It\'s time to go for a walk.',
                                    'Hey, ' + data.nickname + '! You\'ve been inactive for quite a while.',
                                    'Knock knock, ' + data.nickname + '! Why not go for a short walk?',
                                    'Knock knock, ' + data.nickname + '! Get off your butt and get some steps!',
                                    'Knock knock, ' + data.nickname + '! Go for a short walk and score a few hundred steps.',
                                    'Knock knock, ' + data.nickname + '! It\'s time to go for a walk.',
                                    'Knock knock, ' + data.nickname + '! You\'ve been inactive for quite a while.',
                                    'Wake up, ' + data.nickname + '! Why not go for a short walk?',
                                    'Wake up, ' + data.nickname + '! Get off your butt and get some steps!',
                                    'Wake up, ' + data.nickname + '! Go for a short walk and score a few hundred steps.',
                                    'Wake up, ' + data.nickname + '! It\'s time to go for a walk.',
                                    'Wake up, ' + data.nickname + '! You\'ve been inactive for quite a while.',
                                ];
                            
                                var index = Math.floor((Math.random() * messages.length));
                                var message = messages[index];
                            
                                // check if phone number is verified
                                if (data.isPhoneNumberVerified) {
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
                                
                                    data.lastNotificationTime = moment.utc();

                                    data.save();
                                }
                            }
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
    
    res.redirect('/')
}
