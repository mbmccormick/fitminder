var FitbitApiClient = require('fitbit-node');

exports.createSubscription = function(profile, next) {
    console.log('Attempting to create subscription for ' + profile.encodedId);
    
    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);

    return client.requestResource('/activities/apiSubscriptions/' + profile.encodedId + '.json', 'POST', profile.oauthToken, profile.oauthTokenSecret).then(function(results) {
        if (results[1].statusCode != 200 &&
            results[1].statusCode != 201) {
            console.error('Failed');
            return next(new Error('Failed to create Fitbit subscription'));
        }
        
        console.log('Succeeded');

        var payload = JSON.parse(results[0]);

        return payload;
    });
}

exports.deleteSubscription = function(profile, next) {
    console.log('Attempting to delete subscription for ' + profile.encodedId);
    
    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);

    return client.requestResource('/activities/apiSubscriptions/' + profile.encodedId + '.json', 'DELETE', profile.oauthToken, profile.oauthTokenSecret).then(function(results) {
        if (results[1].statusCode != 204 &&
            results[1].statusCode != 404) {
            console.error('Failed');
            return next(new Error('Failed to delete Fitbit subscription'));
        }

        console.log('Succeeded');

        var payload = JSON.parse(results[0]);

        return payload;
    });
}

exports.getTimeseries = function(profile, next) {
    console.log('Attempting to fetch timeseries data for ' + profile.encodedId);
    
    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);

    return client.requestResource('/activities/calories/date/today/1d/15min.json', 'GET', profile.oauthToken, profile.oauthTokenSecret).then(function(results) {
        if (results[1].statusCode != 200) {
            console.error('Failed');
            return next(new Error('Failed to retrieve Fitbit timeseries data'));
        }

        console.log('Succeeded');

        var payload = JSON.parse(results[0]);

        return payload;
    });
}

exports.getActivities = function(profile, next) {
    console.log('Attempting to fetch activity stats for ' + profile.encodedId);
    
    var client = new FitbitApiClient(process.env.FITBIT_CONSUMER_KEY, process.env.FITBIT_CONSUMER_SECRET);

    return client.requestResource('/activities/date/today.json', 'GET', profile.oauthToken, profile.oauthTokenSecret).then(function(results) {
        if (results[1].statusCode != 200) {
            console.error('Failed');
            return next(new Error('Failed to retrieve Fitbit activity stats'));
        }

        console.log('Succeeded');

        var payload = JSON.parse(results[0]);

        return payload;
    });
}
