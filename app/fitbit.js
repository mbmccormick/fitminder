var FitbitApiClient = require('fitbit-node');

exports.obtainOauth20Credentials = function(Profile, profile, next) {
    console.log('Attempting to obtain OAuth 2.0 credentials for ' + profile.id);

    var client = new FitbitApiClient(process.env.FITBIT_CLIENT_ID, process.env.FITBIT_CLIENT_SECRET);

    var refreshToken = profile.oauthToken + ':' + profile.oauthTokenSecret;

    return client.refreshAccesstoken(profile.oauthToken, refreshToken).then(function(token) {
        console.log('Succeeded');
        
        profile.oauthAccessToken = token.access_token;
        profile.oauthRefreshToken = token.refresh_token;
        
        Profile.update(profile);
    }).catch(function(error) {
        console.error('Failed');
        return next(error);
    });
}

exports.createSubscription = function(Profile, profile, next) {
    console.log('Attempting to create subscription for ' + profile.id);

    var client = new FitbitApiClient(process.env.FITBIT_CLIENT_ID, process.env.FITBIT_CLIENT_SECRET);

    var maxAttempts = 2;
    var attempt = -1;

    var friendlyRequest = function(profile) {
        attempt++;

        if (attempt > 0) {
            console.log('Repeating original request, attempt ' + attempt + ' of ' + maxAttempts);
        }

        return client.post('/activities/apiSubscriptions/' + profile.id + '.json', profile.oauthAccessToken).then(function(results) {
            if (results[1].statusCode == 401) {
                console.log('Access token expired for ' + profile.id);

                if (attempt <= maxAttempts) {
                    console.log('Refreshing access token for ' + profile.id);

                    return client.refreshAccesstoken(profile.oauthAccessToken, profile.oauthRefreshToken).then(function(token) {
                        console.log('Succeeded');

                        profile.oauthAccessToken = token.access_token;
                        profile.oauthRefreshToken = token.refresh_token;

                        Profile.update(profile);

                        return friendlyRequest(profile);
                    }).catch(function(error) {
                        console.error('Failed');
                        return next(error);
                    });
                }
            }

            if (results[1].statusCode != 200 &&
                results[1].statusCode != 201) {
                console.error('Failed');
                return next(new Error('Failed to create Fitbit subscription'));
            }

            console.log('Succeeded');

            return results[0];
        });
    };

    return friendlyRequest(profile);
}

exports.deleteSubscription = function(Profile, profile, next) {
    console.log('Attempting to delete subscription for ' + profile.id);

    var client = new FitbitApiClient(process.env.FITBIT_CLIENT_ID, process.env.FITBIT_CLIENT_SECRET);

    var maxAttempts = 2;
    var attempt = -1;

    var friendlyRequest = function(profile) {
        attempt++;

        if (attempt > 0) {
            console.log('Repeating original request, attempt ' + attempt + ' of ' + maxAttempts);
        }

        return client.delete('/activities/apiSubscriptions/' + profile.id + '.json', profile.oauthAccessToken).then(function(results) {
            if (results[1].statusCode == 401) {
                console.log('Access token expired for ' + profile.id);

                if (attempt <= maxAttempts) {
                    console.log('Refreshing access token for ' + profile.id);

                    return client.refreshAccesstoken(profile.oauthAccessToken, profile.oauthRefreshToken).then(function(token) {
                        console.log('Succeeded');

                        profile.oauthAccessToken = token.access_token;
                        profile.oauthRefreshToken = token.refresh_token;

                        Profile.update(profile);

                        return friendlyRequest(profile);
                    }).catch(function(error) {
                        console.error('Failed');
                        return next(error);
                    });
                }
            }

            if (results[1].statusCode != 204 &&
                results[1].statusCode != 404) {
                console.error('Failed');
                return next(new Error('Failed to delete Fitbit subscription'));
            }

            console.log('Succeeded');

            return results[0];
        });
    };

    return friendlyRequest(profile);
}

exports.getTimeseries = function(Profile, profile, next) {
    console.log('Attempting to fetch timeseries data for ' + profile.id);

    var client = new FitbitApiClient(process.env.FITBIT_CLIENT_ID, process.env.FITBIT_CLIENT_SECRET);

    var maxAttempts = 2;
    var attempt = -1;

    var friendlyRequest = function(profile) {
        attempt++;

        if (attempt > 0) {
            console.log('Repeating original request, attempt ' + attempt + ' of ' + maxAttempts);
        }

        return client.get('/activities/calories/date/today/1d/15min.json', profile.oauthAccessToken).then(function(results) {
            if (results[1].statusCode == 401) {
                console.log('Access token expired for ' + profile.id);

                if (attempt <= maxAttempts) {
                    console.log('Refreshing access token for ' + profile.id);

                    return client.refreshAccesstoken(profile.oauthAccessToken, profile.oauthRefreshToken).then(function(token) {
                        console.log('Succeeded');

                        profile.oauthAccessToken = token.access_token;
                        profile.oauthRefreshToken = token.refresh_token;

                        Profile.update(profile);

                        return friendlyRequest(profile);
                    }).catch(function(error) {
                        console.error('Failed');
                        return next(error);
                    });
                }
            }

            if (results[1].statusCode != 200) {
                console.error('Failed');
                return next(new Error('Failed to retrieve Fitbit timeseries data'));
            }

            console.log('Succeeded');

            return results[0];
        });
    };

    return friendlyRequest(profile);
}

exports.getActivities = function(Profile, profile, next) {
    console.log('Attempting to fetch activity stats for ' + profile.id);

    var client = new FitbitApiClient(process.env.FITBIT_CLIENT_ID, process.env.FITBIT_CLIENT_SECRET);

    var maxAttempts = 2;
    var attempt = -1;

    var friendlyRequest = function(profile) {
        attempt++;

        if (attempt > 0) {
            console.log('Repeating original request, attempt ' + attempt + ' of ' + maxAttempts);
        }

        return client.get('/activities/date/today.json', profile.oauthAccessToken).then(function(results) {
            if (results[1].statusCode == 401) {
                console.log('Access token expired for ' + profile.id);

                if (attempt <= maxAttempts) {
                    console.log('Refreshing access token for ' + profile.id);

                    return client.refreshAccesstoken(profile.oauthAccessToken, profile.oauthRefreshToken).then(function(token) {
                        console.log('Succeeded');

                        profile.oauthAccessToken = token.access_token;
                        profile.oauthRefreshToken = token.refresh_token;

                        Profile.update(profile);

                        return friendlyRequest(profile);
                    }).catch(function(error) {
                        console.error('Failed');
                        return next(error);
                    });
                }
            }

            if (results[1].statusCode != 200) {
                console.error('Failed');
                return next(new Error('Failed to retrieve Fitbit activity stats'));
            }

            console.log('Succeeded');

            return results[0];
        });
    };

    return friendlyRequest(profile);
}
