var Profile = require('./models/profile');
var fitbit = require('./fitbit');
var twilio = require('./twilio');

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
                twilio.sendMessage(data.phoneNumber, 'Hey, ' + data.nickname + '! Thanks for updating your phone number with Fitminder. Please reply \"yes\" to confirm your new number.');
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
    
    app.get('/profile/delete', ensureAuthenticated, function(req, res) {

        var query = Profile.where({ encodedId: req.user.encodedId });

        // find the current user's profile
        query.findOne(function(err, data) {            
            // log errors to console
            if (err) {
                console.log('ERROR: Profile.where.findOne');
                console.log(err);
            }
            
            // delete the subscription for this user
            fitbit.deleteSubscription(data);
            
            data.remove();
        });
        
        req.logout();
        res.redirect('/');

    });

    app.get('/profile/landing', ensureAuthenticated, function(req, res) {

        res.render('landing', { user: req.user });

    });

    app.post('/profile/landing', ensureAuthenticated, function(req, res) {

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
            if (data.phoneNumber != req.body.phoneNumber) {
                data.phoneNumber = phoneNumber[0];
                data.isPhoneNumberVerified = false;

                data.save();

                // send a text message to confirm the phone number
                twilio.sendMessage(data.phoneNumber, 'Hey, ' + data.nickname + '! Thanks for signing up for Fitminder. Please reply \"yes\" to confirm your phone number.');
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
                    twilio.sendMessage(data.phoneNumber, 'Awesome. Your phone number has been verified!');
                } else {
                    // send a text message to confirm receipt
                    twilio.sendMessage(phoneNumber[0], 'Hey there! We didn\'t understand your text message. For more information, please visit http://' + process.env.HOSTNAME + '.');
                }
            } else {
                // send a text message to confirm receipt
                twilio.sendMessage(phoneNumber[0], 'Hey there! We didn\'t understand your text message. For more information, please visit http://' + process.env.HOSTNAME + '.');
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
                    // fetch the user's activity timeseries data
                    var timeseries = fitbit.getTimeseries(data);
                    
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
                            var activities = fitbit.getActivities(data);
                                    
                            // check if user has met step goal for today
                            if (activities.summary.steps < activities.goals.steps) {
                                var reminder = generateReminder(data);
                                    
                                // check if phone number is verified
                                if (data.isPhoneNumberVerified) {
                                    // send a text message to notify the user
                                    twilio.sendMessage(data.phoneNumber, reminder);
                                        
                                    data.lastNotificationTime = moment.utc();

                                    data.save();
                                }
                            }
                        } else {
                            var reminder = generateReminder(data);
                            
                            // check if phone number is verified
                            if (data.isPhoneNumberVerified) {
                                // send a text message to notify the user
                                twilio.sendMessage(data.phoneNumber, reminder);
                                
                                data.lastNotificationTime = moment.utc();

                                data.save();
                            }
                        }
                    }
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