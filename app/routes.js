var Profile = require('./models/profile');
var fitbit = require('./fitbit');
var twilio = require('./twilio');
var stripe = require('./stripe');

var async = require('async');
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
				var query = Profile.where({ phoneNumber: phoneNumber[0] });
				
				// find the user associated with this notification
				query.findOne(function(err, data) {
					if (err) {
						// send a text message to confirm receipt
						twilio.sendGenericMessage(phoneNumber[0], 'Hey there! We didn\'t understand your text message. For more information, please visit http://' + process.env.HOSTNAME + '.', next);
						
						callback(err);
					} else {					
    					data.lastSyncTime = moment.utc();
    
    					data.save();
    					
    					callback(null, data);
                    }
				});
			},
			
			function(data, callback) {
				// check to see if the user correctly verified their number
				if (req.body.Body.trim().toLowerCase() == 'yes') {
					data.isPhoneNumberVerified = true;
					
					data.save();
					
					// send a text message to confirm number verification
					twilio.sendMessage(data, 'Awesome. Your phone number has been verified!', next);
				} else {
					// send a text message to confirm receipt
					twilio.sendGenericMessage(phoneNumber[0], 'Hey there! We didn\'t understand your text message. For more information, please visit http://' + process.env.HOSTNAME + '.', next);
				}
			}
			
		], function (err, result) {
			if (err) {
				console.log(err);
				return next(err);
			}
		});

        // acknowledge the request
        res.set('Content-Type', 'text/plain');
        res.status(200).end();

    });

    app.post('/api/fitbit/notification', function(req, res, next) {

        // process the individual notifications
		req.body.forEach(function(item) {
			
			// spawn the asynchronous waterfall handler
			async.waterfall([
			
				function(callback) {
					var query = Profile.where({ encodedId: item.ownerId });
					
					// find the user associated with this notification
					query.findOne(function(err, data) {
						if (err) {
							callback(err);
						} else {						
    						data.lastSyncTime = moment.utc();
    
    						data.save();
    						
    						callback(null, data);
                        }
					});
				},
				
				function(data, callback) {
					// check if user has an active account
					if (data.expirationDate > moment.utc()) {
						callback(null, data);
					} else {					
					   callback(new Error('The user\'s account has expired. No action required.'));
                    }
				},
				
				function(data, callback) {
					// check if user's account is nearing expiry
					if (data.expirationDate <= moment.utc().add(1, 'weeks')) {
						// check if phone number is verified
						if (data.isPhoneNumberVerified) {
							console.log('Sending account expiration notice for ' + data.encodedId);
							
							// send a text message to notify the user
							twilio.sendMessage(data, 'Your Fitminder account will expire ' + moment(data.expirationDate).fromNow() + '. Head over to http://' + process.env.HOSTNAME + ' soon to make a payment.', next);
						}
					}
					
					callback(null, data);
				},
				
				function (data, callback) {
					// check the last notification time and see if we are inside the user's reminder window
					if (data.lastNotificationTime < moment.utc().subtract(data.inactivityThreshold * 15, 'minutes') &&
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
							console.log('Sending inactivity reminder for ' + data.encodedId);
							
							// send a text message to notify the user
							twilio.sendMessage(data, reminder, next);

							data.lastNotificationTime = moment.utc();

							data.save();
						}
					}
				}
				
			], function (err, result) {
				if (err) {
					console.log(err);
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
