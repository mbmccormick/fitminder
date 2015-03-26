// setup =======================================================================
var express  = require('express');
var app      = express();
var port     = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');

var database = require('./config/database');

// configuration ===============================================================
// mongoose.connect(database.url);

require('./config/passport')(passport, port);

app.configure(function() {

	// set up our express application
	app.use(express.logger('dev'));
	app.use(express.cookieParser());
	app.use(express.bodyParser());

	app.set('view engine', 'ejs');

	// required for passport
	app.use(express.session({ secret: 'fitminder' }));
	app.use(passport.initialize());
	app.use(passport.session());

});

// routes ======================================================================
require('./app/routes.js')(app, passport);

// listen ======================================================================
app.listen(port);
console.log('App is listening on port ' + port);
