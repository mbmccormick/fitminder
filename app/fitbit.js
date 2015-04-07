var FitbitApiClient = require('fitbit-node');

exports.createSubscription = function(profile) {
    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);

    return client.requestResource('/activities/apiSubscriptions/' + profile.encodedId + '.json', 'POST', profile.oauthToken, profile.oauthTokenSecret).then(function(results) {
        if (results[1].statusCode != 200 ||
            results[1].statusCode != 201) {
            throw new Error('Failed to create Fitbit subscription');
        }

        var payload = JSON.parse(results[0]);

        return payload;
    });
}

exports.deleteSubscription = function(profile) {
    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);

    return client.requestResource('/activities/apiSubscriptions/' + profile.encodedId + '.json', 'DELETE', profile.oauthToken, profile.oauthTokenSecret).then(function(results) {
        if (results[1].statusCode != 204 ||
            results[1].statusCode != 404) {
            throw new Error('Failed to delete Fitbit subscription');
        }

        var payload = JSON.parse(results[0]);

        return payload;
    });
}

exports.getTimeseries = function(profile) {
    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);

    return client.requestResource('/activities/calories/date/today/1d/15min.json', 'GET', profile.oauthToken, profile.oauthTokenSecret).then(function(results) {
        if (results[1].statusCode != 200) {
            throw new Error('Failed to retrieve Fitbit timeseries data');
        }

        var payload = JSON.parse(results[0]);

        return payload;
    });
}

exports.getActivities = function(profile) {
    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);

    return client.requestResource('/activities/date/today.json', 'GET', profile.oauthToken, profile.oauthTokenSecret).then(function(results) {
        if (results[1].statusCode != 200) {
            throw new Error('Failed to retrieve Fitbit activity stats');
        }

        var payload = JSON.parse(results[0]);

        return payload;
    });
}
