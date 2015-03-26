var Profile = require('./models/profile');

module.exports = function (app, passport) {

    app.get('/', function (req, res) {

        res.render('index', { user: req.user });

	});

	app.get('/login', function(req, res) {

	    res.render('login', { user: req.user });

	});

	app.get('/auth/fitbit', passport.authenticate('fitbit'), function (req, res) {

        // do nothing
	    
	});

	app.get('/auth/fitbit/callback', passport.authenticate('fitbit', { failureRedirect: '/login' }), function(req, res) {

	    res.redirect('/');

	});

	app.post('/api/payload', function (req, res) {

	    var json = JSON.parse(req.body);
	    console.log(json);

	    for (var update in json) {
	        var query = Profile.where({ encodedId: update.ownerId });

	        query.findOne(function (err, data) {
	            if (data) {
                    // TODO: process incoming payload

	                data.lastSyncTime = Date.now;

	                data.save();

	                return done(null, data);
	            }
	        });
	    }

	});

	app.get('/logout', function (req, res) {

		req.logout();
		res.redirect('/');

	});

};
