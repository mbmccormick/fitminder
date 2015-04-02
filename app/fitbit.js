var FitbitApiClient = require('fitbit-node');

exports.createSubscription = function(profile) {
    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);

    client.requestResource('/activities/apiSubscriptions/' + profile.encodedId + '.json', 'POST', profile.oauthToken, profile.oauthTokenSecret).then(function(results) {
        if (results[1].statusCode != 200 ||
            results[1].statusCode != 201) {
            // log errors to console
            if (err) {
                console.log('ERROR: fitbit.createSubscription');
                console.log(err);
            }

            var payload = JSON.parse(results[0]);

            return payload;
        }
    });
}

exports.deleteSubscription = function(profile) {
    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);

    client.requestResource('/activities/apiSubscriptions/' + profile.encodedId + '.json', 'DELETE', profile.oauthToken, profile.oauthTokenSecret).then(function(results) {
        if (results[1].statusCode != 204 ||
            results[1].statusCode != 404) {
            // log errors to console
            if (err) {
                console.log('ERROR: fitbit.deleteSubscription');
                console.log(err);
            }

            var payload = JSON.parse(results[0]);

            return payload;
        }
    });
}

exports.getTimeseries = function(profile) {
    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);

    client.requestResource('/activities/calories/date/today/1d/15min.json', 'GET', data.oauthToken, data.oauthTokenSecret).then(function(results) {
        if (results[1].statusCode != 200) {
            // log errors to console
            if (err) {
                console.log('ERROR: fitbit.getTimeseries');
                console.log(err);
            }

            var payload = JSON.parse(results[0]);

            return payload;
        }
    });
}

exports.getActivities = function(profile) {
    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);

    client.requestResource('/activities/date/today.json', 'GET', data.oauthToken, data.oauthTokenSecret).then(function(results) {
        if (results[1].statusCode != 200) {
            // log errors to console
            if (err) {
                console.log('ERROR: fitbit.getActivities');
                console.log(err);
            }

            var payload = JSON.parse(results[0]);

            return payload;
        }
    });
}
