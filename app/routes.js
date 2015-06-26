var Profile = require('./models/profile');
var fitbit = require('./fitbit');
var twilio = require('./twilio');
var stripe = require('./stripe');

var phone = require('phone');
var moment = require('moment-timezone');

module.exports = function(app, passport) {

    app.get('/', function(req, res, next) {

        res.render('index', { user: req.user });

    });

    app.get('/auth/fitbit', passport.authenticate('fitbit'), function(req, res, next) {

        // do nothing
        
    });

    app.get('/auth/fitbit/callback', passport.authenticate('fitbit', { failureRedirect: '/login' }), function(req, res, next) {

        res.redirect('/profile');

    });
    
    app.get('/profile', ensureAuthenticated, function(req, res, next) {

        if (req.user.phoneNumber != null) {
            res.render('profile', { user: req.user });
        } else {
            res.redirect('/profile/landing');
        }

    });
    
    app.post('/profile', ensureAuthenticated, function(req, res, next) {

        var query = Profile.where({ encodedId: req.user.encodedId });

        // find the current user's profile
        query.findOne(function(err, data) {            
            if (err) {
                console.log('Failed to retrieve data for query ' + query);
                return next(err);
            }
            
            var phoneNumber = phone(req.body.phoneNumber);
            if (phoneNumber == null ||
                phoneNumber[0] == null) {
                console.log('Failed to validate phone number ' + req.body.phoneNumber);
                return next(new Error('Failed to validate phone number ' + req.body.phoneNumber));
            }
            
            // check to see if they are changing their phone number
            if (data.phoneNumber != phoneNumber[0]) {
                data.phoneNumber = phoneNumber[0];
                data.isPhoneNumberVerified = false;
                
                data.save();
                
                console.log('Sending phone number verification message for ' + data.encodedId);
                
                // send a text message to confirm the phone number
                twilio.sendMessage(data, 'Hey, ' + data.nickname + '! Thanks for updating your phone number with Fitminder. Please reply \"yes\" to confirm your new number.', next);
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
    
    app.get('/profile/delete', ensureAuthenticated, function(req, res, next) {

        var query = Profile.where({ encodedId: req.user.encodedId });

        // find the current user's profile
        query.findOne(function(err, data) {            
            if (err) {
                console.log('Failed to retrieve data for query ' + query);
                return next(err);
            }
            
            // delete the subscription for this user
            fitbit.deleteSubscription(data, next);
            
            data.remove();
        });
        
        req.logout();
        res.redirect('/');

    });

    app.get('/profile/landing', ensureAuthenticated, function(req, res, next) {

        res.render('landing', { user: req.user });

    });

    app.post('/profile/landing', ensureAuthenticated, function(req, res, next) {

        var query = Profile.where({ encodedId: req.user.encodedId });

        // find the current user's profile
        query.findOne(function(err, data) {
            if (err) {
                console.log('Failed to retrieve data for query ' + query);
                return next(err);
            }
            
            var phoneNumber = phone(req.body.phoneNumber);
            if (phoneNumber == null ||
                phoneNumber[0] == null) {
                console.log('Failed to validate phone number ' + req.body.phoneNumber);
                return next(new Error('Failed to validate phone number ' + req.body.phoneNumber));
            }

            // check to see if they are changing their phone number
            if (data.phoneNumber != phoneNumber[0]) {
                data.phoneNumber = phoneNumber[0];
                data.isPhoneNumberVerified = false;

                data.save();
                
                console.log('Sending phone number verification message for ' + data.encodedId);

                // send a text message to confirm the phone number
                twilio.sendMessage(data, 'Hey, ' + data.nickname + '! Thanks for signing up for Fitminder. Please reply \"yes\" to confirm your phone number.', next);
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

    app.post('/profile/billing', ensureAuthenticated, function(req, res, next) {

        var query = Profile.where({ encodedId: req.user.encodedId });

        // find the current user's profile
        query.findOne(function(err, data) {            
            if (err) {
                console.log('Failed to retrieve data for query ' + query);
                return next(err);
            }
            
            // create the charge for this token
            stripe.createCharge(data, req.body.token, next).then(function(charge) {
                if (charge.status == 'succeeded') {
                    console.log('Extending account expiration date for ' + data.encodedId);                
                    data.expirationDate = moment(data.expirationDate).add(1, 'years');
                    
                    data.save();
                
                    // update the user's profile currently stored in session
                    req.user = data;
                }
            
                res.redirect('/profile');
            });
        });

    });
    
    app.post('/api/twilio/inbound', function(req, res, next) {

        var phoneNumber = phone(req.body.From, req.body.FromCountry);
        if (phoneNumber == null ||
            phoneNumber[0] == null) {
            console.log('Failed to validate phone number ' + req.body.From);
            return next(new Error('Failed to validate phone number ' + req.body.From));
        }
        
        var query = Profile.where({ phoneNumber: phoneNumber[0] });

        // find the user profile associated with this phone number
        query.findOne(function(err, data) {            
            if (err) {
                console.log('Failed to retrieve data for query ' + query);
                return next(err);
            }
            
            // check to see if we found a user
            if (data) {
                // check to see if they correctly verified their number
                if (req.body.Body.trim().toLowerCase() == 'yes') {
                    data.isPhoneNumberVerified = true;
                    
                    data.save();
                    
                    // send a text message to confirm number verification
                    twilio.sendMessage(data, 'Awesome. Your phone number has been verified!', next);
                } else {
                    // send a text message to confirm receipt
                    twilio.sendGenericMessage(phoneNumber[0], 'Hey there! We didn\'t understand your text message. For more information, please visit http://' + process.env.HOSTNAME + '.', next);
                }
            } else {
                // send a text message to confirm receipt
                twilio.sendGenericMessage(phoneNumber[0], 'Hey there! We didn\'t understand your text message. For more information, please visit http://' + process.env.HOSTNAME + '.', next);
            }
        });

        // acknowledge the request
        res.set('Content-Type', 'text/plain');
        res.status(200).end();

    });

    app.post('/api/fitbit/notification', function(req, res, next) {

        // process the individual notifications
        for (var i = 0; i < req.body.length; i++) {
            var query = Profile.where({ encodedId: req.body[i].ownerId });

            // find the user associated with this notification
            query.findOne(function(err, data) {
                if (err) {
                    console.log('Failed to retrieve data for query ' + query);
                    return next(err);
                }
                
                data.lastSyncTime = moment.utc();

                data.save();
                
                // check if user has an active account
                if (data.expirationDate > moment.utc()) {
                    // check if user's account is nearing expiry
                    if (data.expirationDate <= moment.utc().substract(1, 'weeks')) {
                        // check if phone number is verified
                        if (data.isPhoneNumberVerified) {
                            console.log('Sending inactivity reminder for ' + data.encodedId);
                            
                            // send a text message to notify the user
                            twilio.sendMessage(data, 'Your Fitminder account will expire in one week. Head over to http://' + process.env.HOSTNAME + ' soon to make a payment.', next);
                        }
                    }
                    
                    // check the last notification time and see if we are inside the user's reminder window
                    if (data.lastNotificationTime < moment.utc().subtract(data.inactivityThreshold * 15, 'minutes') &&
                        moment.utc().tz(data.timezone).hour() >= data.startTime &&
                        moment.utc().tz(data.timezone).hour() < data.endTime) {
                        // fetch the user's activity timeseries data
                        fitbit.getTimeseries(data, next).then(function(timeseries) {
                            var sedentaryCount = 0;
    
                            // loop through the timeseries data to find when how long user has been sedentary
                            for (var j = timeseries['activities-calories-intraday'].dataset.length - 1; j >= 0; j--) {
                                if (timeseries['activities-calories-intraday'].dataset[j].level == 0) {
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
                                    fitbit.getActivities(data, next).then(function(activities) {                                        
                                        // check if user has met step goal for today
                                        if (activities.summary.steps < activities.goals.steps) {
                                            var reminder = generateReminder(data);
    
                                            // check if phone number is verified
                                            if (data.isPhoneNumberVerified) {
                                                console.log('Sending inactivity reminder for ' + data.encodedId);
                                                
                                                // send a text message to notify the user
                                                twilio.sendMessage(data, reminder, next);
    
                                                data.lastNotificationTime = moment.utc();
    
                                                data.save();
                                            }
                                        }
                                    });
                                } else {
                                    var reminder = generateReminder(data);
    
                                    // check if phone number is verified
                                    if (data.isPhoneNumberVerified) {
                                        console.log('Sending inactivity reminder for ' + data.encodedId);
                                        
                                        // send a text message to notify the user
                                        twilio.sendMessage(data, reminder, next);
    
                                        data.lastNotificationTime = moment.utc();
    
                                        data.save();
                                    }
                                }
                            }
                        });
                    }
                } else {
                    console.log('Ignoring payload for ' + data.encodedId + ' because user\'s account is expired');
                }
            });
        }

        // acknowledge the notification
        res.set('Content-Type', 'text/plain');
        res.status(204).end();

    });

    app.get('/logout', function(req, res, next) {

        req.logout();
        res.redirect('/');

    });
    
    app.use(function(req, res, next) {

        res.status(404);
        res.render('404');

    });
    
    app.use(function(error, req, res, next) {

        res.status(500);
        res.render('500', { exception: error });

        next(error);

    });

};

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    
    res.redirect('/');
}

function generateGreeting(profile) {
    var greetings = [
        'Get up and move, ' + profile.nickname + '!',
        'Hey, ' + profile.nickname + '!',
        'Knock knock, ' + profile.nickname + '!',
        'Wake up, ' + profile.nickname + '!'
    ];

    var index = Math.floor((Math.random() * greetings.length));

    return greetings[index];
}

function generateMessage(profile) {
    var messages = [
        'Why not go for a short walk?',
        'Go for a short walk and score a few hundred steps.',
        'It\'s time to go for a walk.',
        'You\'ve been inactive for quite a while.',
        'Get off your butt and get some steps!'
    ];

    var index = Math.floor((Math.random() * messages.length));

    return messages[index];
}

function generateReminder(profile) {
    var reminder = generateGreeting(profile) + ' ' + generateMessage(profile);

    return reminder;
}
