var fitbit = require('./fitbit');
var twilio = require('./twilio');
var ifttt = require('./ifttt');
var stripe = require('./stripe');

var async = require('async');
var phone = require('phone');
var moment = require('moment-timezone');

module.exports = function(app, Profile, passport) {

    app.get('/', ensureHostname, function(req, res, next) {

        if (req.user) {
            res.redirect('/profile');
        } else {
            res.render('index', { user: req.user });
        }

    });

    app.get('/faq', function(req, res, next) {

        if (req.user) {
            res.redirect('/profile');
        } else {
            res.render('faq', { user: req.user });
        }

    });

    app.get('/auth/fitbit', passport.authenticate('fitbit'), function(req, res, next) {

        // do nothing

    });

    app.get('/auth/fitbit/callback', passport.authenticate('fitbit', { failureRedirect: '/login' }), function(req, res, next) {

        res.redirect('/profile');

    });

    app.get('/profile', ensureSecured, ensureAuthenticated, function(req, res, next) {

        if (req.user.phoneNumber != null) {
            res.render('profile', { user: req.user });
        } else {
            res.redirect('/profile/landing');
        }

    });

    app.post('/profile', ensureSecured, ensureAuthenticated, function(req, res, next) {

        // find the current user's profile
        Profile.findById(req.user.id, function(err, data) {
            if (err || !data) {
                console.error('Failed to retrieve data for ' + req.user.id);
                return next(err || new Error('Failed to retrieve data for ' + req.user.id));
            }

            var phoneNumber = phone(req.body.phoneNumber);
            if (phoneNumber == null ||
                phoneNumber[0] == null) {
                console.error('Failed to validate phone number ' + req.body.phoneNumber);
                return next(new Error('Failed to validate phone number ' + req.body.phoneNumber));
            }

            // check to see if they are changing their phone number
            if (data.phoneNumber != phoneNumber[0]) {
                data.phoneNumber = phoneNumber[0];
                data.isPhoneNumberVerified = false;

                Profile.update(data);

                console.log('Sending phone number verification message for ' + data.id);

                // send a text message to confirm the phone number
                twilio.sendMessage(data, 'Hey, ' + data.nickname + '! Thanks for updating your phone number with Fitminder. Please reply \"yes\" to confirm your new number.', next);
            }

            data.iftttSecretKey = req.body.iftttSecretKey;
            data.inactivityThreshold = req.body.inactivityThreshold;
            data.startTime = req.body.startTime;
            data.endTime = req.body.endTime;
            data.dontSendRemindersAfterGoal = req.body.dontSendRemindersAfterGoal ? true : false;

            Profile.update(data);

            // update the user's profile currently stored in session
            req.user = data;

            res.render('profile', { user: req.user });
        });

    });

    app.get('/profile/landing', ensureSecured, ensureAuthenticated, function(req, res, next) {

        res.render('landing', { user: req.user });

    });

    app.post('/profile/landing', ensureSecured, ensureAuthenticated, function(req, res, next) {

        // find the current user's profile
        Profile.findById(req.user.id, function(err, data) {
            if (err || !data) {
                console.error('Failed to retrieve data for ' + req.user.id);
                return next(err || new Error('Failed to retrieve data for ' + req.user.id));
            }

            var phoneNumber = phone(req.body.phoneNumber);
            if (phoneNumber == null ||
                phoneNumber[0] == null) {
                console.error('Failed to validate phone number ' + req.body.phoneNumber);
                return next(new Error('Failed to validate phone number ' + req.body.phoneNumber));
            }

            // check to see if they are changing their phone number
            if (data.phoneNumber != phoneNumber[0]) {
                data.phoneNumber = phoneNumber[0];
                data.isPhoneNumberVerified = false;

                Profile.update(data);

                console.log('Sending phone number verification message for ' + data.id);

                // send a text message to confirm the phone number
                twilio.sendMessage(data, 'Hey, ' + data.nickname + '! Thanks for signing up for Fitminder. Please reply \"yes\" to confirm your phone number.', next);
            }

            data.inactivityThreshold = req.body.inactivityThreshold;
            data.startTime = req.body.startTime;
            data.endTime = req.body.endTime;
            data.dontSendRemindersAfterGoal = req.body.dontSendRemindersAfterGoal ? true : false;

            Profile.update(data);

            // update the user's profile currently stored in session
            req.user = data;

            res.render('landing', { user: req.user });
        });

    });

    app.post('/profile/billing', ensureSecured, ensureAuthenticated, function(req, res, next) {

        // find the current user's profile
        Profile.findById(req.user.id, function(err, data) {
            if (err || !data) {
                console.error('Failed to retrieve data for ' + req.user.id);
                return next(err || new Error('Failed to retrieve data for ' + req.user.id));
            }

            // create the charge for this token
            stripe.createCharge(data, req.body.token, next).then(function(charge) {
                if (charge.status == 'succeeded') {
                    console.log('Extending account expiration date for ' + data.id);
                    data.expirationDate = moment(new Date(data.expirationDate)).add(1, 'years');

                    Profile.update(data);

                    // update the user's profile currently stored in session
                    req.user = data;
                } else {
                    console.error('Failed to validate charge ' + charge.id);
                    return next(new Error('Failed to validate charge ' + charge.id));
                }

                res.redirect('/profile');
            });
        });

    });

    app.get('/profile/delete', ensureSecured, ensureAuthenticated, function(req, res, next) {

        // find the current user's profile
        Profile.findById(req.user.id, function(err, data) {
            if (err || !data) {
                console.error('Failed to retrieve data for ' + req.user.id);
                return next(err || new Error('Failed to retrieve data for ' + req.user.id));
            }

            // delete the subscription for this user
            fitbit.deleteSubscription(data, next);

            Profile.delete(data);
        });

        req.logout();
        res.redirect('/');

    });

    app.post('/api/twilio/inbound', function(req, res, next) {

        // spawn the asynchronous waterfall handler
        async.waterfall([

            function(callback) {
                var phoneNumber = phone(req.body.From, req.body.FromCountry);

                // validate the phone number
                if (phoneNumber == null ||
                    phoneNumber[0] == null) {
                    callback(new Error('Failed to validate phone number ' + req.body.From));
                } else {
                    callback(null, phoneNumber);
                }
            },

            function(phoneNumber, callback) {
                var querySpec = {
                    query: 'SELECT * FROM root r WHERE r.phoneNumber=@phoneNumber',
                    parameters: [{
                        name: '@phoneNumber',
                        value: phoneNumber[0]
                    }]
                };

                // find the user associated with this notification
                Profile.findOne(querySpec, function(err, data) {
                    if (err || !data) {
                        // send a text message to confirm receipt
                        twilio.sendGenericMessage(phoneNumber[0], 'Hey there! We didn\'t understand your text message. For more information, please visit http://' + process.env.HOSTNAME + '.', next);

                        console.error('Failed to retrieve data for ' + phoneNumber[0]);
                        callback(err || new Error('Failed to retrieve data for ' + phoneNumber[0]), true);
                    } else {
                        callback(null, data);
                    }
                });
            },

            function(data, callback) {
                // check to see if the user correctly verified their number
                if (req.body.Body.toLowerCase().trim() == 'yes') {
                    data.isPhoneNumberVerified = true;

                    Profile.update(data);

                    // send a text message to confirm number verification
                    twilio.sendMessage(data, 'Awesome. Your phone number has been verified!', next);
                } else if (req.body.Body.toLowerCase().indexOf('stop') > -1) {
                    data.isPhoneNumberVerified = false;

                    Profile.update(data);

                    // send a text message to confirm number verification
                    twilio.sendMessage(data, 'Sorry to see you go! Your account has been deactivated.', next);
                } else {
                    // send a text message to confirm receipt
                    twilio.sendGenericMessage(data.phoneNumber, 'Hey there! We didn\'t understand your text message. For more information, please visit http://' + process.env.HOSTNAME + '.', next);
                }
            }

        ], function (err, result) {
            if (err) {
                console.error(err);

                if (result)
                    return next(err);
            }
        });

        // acknowledge the request
        res.set('Content-Type', 'text/plain');
        res.status(200).end();

    });

    app.post('/api/fitbit/notification', function(req, res, next) {

        // process the individual notifications
        req.body.forEach(function (item) {

            // spawn the asynchronous waterfall handler
            async.waterfall([

                function(callback) {
                    console.log('Received notification payload for ' + item.ownerId);

                    // find the user associated with this notification
                    Profile.findById(item.ownerId, function(err, data) {
                        if (err || !data) {
                            console.error('Failed to retrieve data for ' + item.ownerId);
                            callback(err || new Error('Failed to retrieve data for ' + item.ownerId), true);
                        } else {
                            data.lastSyncTime = moment.utc();

                            Profile.update(data);

                            callback(null, data);
                        }
                    });
                },

                function(data, callback) {
                    // check if user has an active account
                    if (new Date(data.expirationDate) > moment.utc()) {
                        callback(null, data);
                    } else {
                        if (new Date(data.lastNotificationTime) < new Date(data.expirationDate)) {
                            console.log('Sending final account expiration notice for ' + data.id);

                            // send a text message to notify the user
                            twilio.sendMessage(data, 'Your Fitminder account has expired and you will no longer receive activity reminders! Login at http://' + process.env.HOSTNAME + ' to renew your membership.', next);

                            data.lastNotificationTime = moment.utc();

                            Profile.update(data);
                        }

                        // delete the subscription for this user
                        fitbit.deleteSubscription(data, next);

                        callback(new Error('The user\'s account has expired. No action required.'));
                    }
                },

                function (data, callback) {
                    // check the last notification time and see if we are inside the user's reminder window
                    if (new Date(data.lastNotificationTime) < moment.utc().subtract(data.inactivityThreshold * 15, 'minutes') &&
                        moment.utc().tz(data.timezone).hour() >= data.startTime &&
                        moment.utc().tz(data.timezone).hour() < data.endTime) {
                        callback(null, data);
                    } else {
                        callback(new Error('Outside of reminder window or inside of notification threshold. No action required.'));
                    }
                },

                function (data, callback) {
                    // check if we need to check for the user's step goal
                    if (data.dontSendRemindersAfterGoal) {
                        // fetch the user's stats for today
                        fitbit.getActivities(data, next).then(function(activities) {
                            // check if user has met step goal for today
                            if (activities.summary.steps < activities.goals.steps) {
                                callback(null, data);
                            } else {
                                callback(new Error('User has not met step goal for today. No action required.'));
                            }
                        });
                    } else {
                        callback(null, data);
                    }
                },

                function (data, callback) {
                    // fetch the user's activity timeseries data
                    fitbit.getTimeseries(data, next).then(function(timeseries) {
                        var sedentaryCount = 0;

                        // loop through the timeseries data to find how long user has been sedentary
                        for (var j = timeseries['activities-calories-intraday'].dataset.length - 1; j >= 0; j--) {
                            if (timeseries['activities-calories-intraday'].dataset[j].level == 0) {
                                sedentaryCount++;
                            } else {
                                break;
                            }
                        }

                        callback(null, sedentaryCount, data);
                    });
                },

                function (sedentaryCount, data, callback) {
                    // check if user has been sedentary for too long
                    if (sedentaryCount > data.inactivityThreshold) {
                        var reminder = generateReminder(data);

                        // check if phone number is verified
                        if (data.isPhoneNumberVerified) {
                            console.log('Sending inactivity reminder for ' + data.id);

                            if (data.iftttSecretKey) {
                                // send an event to IFTTT
                                ifttt.sendEvent(data, reminder, sedentaryCount * 15, null, next);
                            } else {
                                // send a text message to notify the user
                                twilio.sendMessage(data, reminder, next);
                            }

                            data.lastNotificationTime = moment.utc();

                            Profile.update(data);

                            callback(null, data);
                        } else {
                            callback(null, data);
                        }
                    } else {
                        callback(new Error('User has not exceeded inactivity threshold. No action required.'));
                    }
                },

                function(data, callback) {
                    // check if user's account is nearing expiry
                    if (new Date(data.expirationDate) <= moment.utc().add(1, 'weeks') &&
                        Math.floor(Math.random() * 2) == 0) { // only do this 33% of the time
                        // check if phone number is verified
                        if (data.isPhoneNumberVerified) {
                            console.log('Sending account expiration notice for ' + data.id);

                            // send a text message to notify the user
                            twilio.sendMessage(data, 'Your Fitminder account will expire ' + moment(new Date(data.expirationDate)).fromNow() + '! Login at http://' + process.env.HOSTNAME + ' soon to renew your membership.', next);
                        }
                    }
                }

            ], function (err, result) {
                if (err) {
                    console.error(err);

                    if (result)
                       return next(err);
                }
            });

        });

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

        console.error(error);

        if (res.headerSent == false) {
            res.status(500);
            res.render('500', { exception: error });
        }

        next(error);

    });

};

function ensureHostname(req, res, next) {
    if (req.headers.host === process.env.HOSTNAME) {
        return next();
	}

	res.redirect("http://" + process.env.HOSTNAME + req.url);
}

function ensureSecured(req, res, next) {
    if (process.env.REQUIRE_SSL) {
        if (req.headers["x-forwarded-proto"] === "https" ||
            req.headers['x-arr-ssl']) {
            return next();
        }

        res.redirect("https://" + req.headers.host + req.url);
    } else {
        return next();
    }
}

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
        'Wake up, ' + profile.nickname + '!',
        'Hi, ' + profile.nickname + '!',
        profile.nickname + '!'
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
