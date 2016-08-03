// setup =======================================================================
var express = require('express');
var path = require('path');
var logger = require('morgan');
var session = require('cookie-session');
var ejs = require('ejs');
var partials = require('express-partials');
var bodyParser = require('body-parser');

var documentdb = require('documentdb').DocumentClient;
var Profile = require('./app/models/profile');

var passport = require('passport');
var moment = require('moment-timezone');

var app = express();

// configuration ===============================================================
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(partials());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 1000 * 60 * 60 * 24 * 7}));

var documentDbClient = new documentdb(process.env.DOCUMENTDB_HOST, {
    masterKey: process.env.DOCUMENTDB_AUTH_KEY
});

var profile = new Profile(documentDbClient, 'fitminder', 'profiles');
profile.initialize();

require('./config/passport')(profile, passport);

app.use(session({
        secret: 'fitminder',
        resave: true,
        saveUninitialized: true
    }
));
app.use(passport.initialize());
app.use(passport.session());

app.locals.fromNow = function (date) {
    if (date && date.getTime() != 0)
        return moment(date).fromNow();
    else
        return 'never';
}

app.locals.utc = function () {
    return moment.utc();
}

app.locals.add = function (date, amount, unit) {
    return moment(date).add(amount, unit);
}

app.locals.subtract = function (date, amount, unit) {
    return moment(date).subtract(amount, unit);
}

// routes ======================================================================
require('./app/routes')(app, profile, passport);

// listen ======================================================================
app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});
