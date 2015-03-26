module.exports = function(app, passport) {

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

	app.get('/logout', function (req, res) {

		req.logout();
		res.redirect('/');

	});

};
