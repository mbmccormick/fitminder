var FitbitApiClient = require('fitbit-node');

exports.createSubscription = function(Profile, profile, next) {
    console.log('Attempting to create subscription for ' + profile.id);

    var client = new FitbitApiClient(process.env.FITBIT_CLIENT_ID, process.env.FITBIT_CLIENT_SECRET);

    var maxRequests = 3;
        
    var friendlyRequest = function() {
        maxRequests--;
        
        return client.post('/activities/apiSubscriptions/' + profile.id + '.json', profile.oauthAccessToken).then(function(results) {
            if (results[1].statusCode == 401) {
                console.log('Access token expired for ' + profile.id);
                
                if (maxRequests > 0) {
                    console.log('Refreshing access token for ' + profile.id);
                    
                    return client.refreshAccesstoken(profile.oauthRefreshToken).then(function(token) {
                        if (results[1].statusCode != 200) {                
                            console.error('Failed');
                            return next(new Error('Failed to refresh expired Fitbit access token'));
                        }
                        
                        profile.oauthAccessToken = token.access_token;
                        profile.oauthRefreshToken = token.refresh_token;
                        Profile.update(profile);
                        
                        return friendlyRequest();
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
    
    return friendlyRequest();
}

exports.deleteSubscription = function(Profile, profile, next) {
    console.log('Attempting to delete subscription for ' + profile.id);

    var client = new FitbitApiClient(process.env.FITBIT_CLIENT_ID, process.env.FITBIT_CLIENT_SECRET);

    var maxRequests = 2;
        
    var friendlyRequest = function() {
        maxRequests--;
        
        return client.delete('/activities/apiSubscriptions/' + profile.id + '.json', profile.oauthAccessToken).then(function(results) {
            if (results[1].statusCode == 401) {
                console.log('Access token expired for ' + profile.id);
                
                if (maxRequests > 0) {
                    console.log('Refreshing access token for ' + profile.id);
                    
                    return client.refreshAccesstoken(profile.oauthRefreshToken).then(function(token) {
                        if (results[1].statusCode != 200) {                
                            console.error('Failed');
                            return next(new Error('Failed to refresh expired Fitbit access token'));
                        }
                        
                        profile.oauthAccessToken = token.access_token;
                        profile.oauthRefreshToken = token.refresh_token;
                        Profile.update(profile);
                        
                        return friendlyRequest();
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
    
    return friendlyRequest();
}

exports.getTimeseries = function(Profile, profile, next) {
    console.log('Attempting to fetch timeseries results[0] for ' + profile.id);

    var client = new FitbitApiClient(process.env.FITBIT_CLIENT_ID, process.env.FITBIT_CLIENT_SECRET);

    var maxRequests = 2;
        
    var friendlyRequest = function() {
        maxRequests--;
        
        return client.get('/activities/calories/date/today/1d/15min.json', profile.oauthAccessToken).then(function(results) {
            if (results[1].statusCode == 401) {
                console.log('Access token expired for ' + profile.id);
                
                if (maxRequests > 0) {
                    console.log('Refreshing access token for ' + profile.id);
                    
                    return client.refreshAccesstoken(profile.oauthRefreshToken).then(function(token) {
                        if (results[1].statusCode != 200) {                
                            console.error('Failed');
                            return next(new Error('Failed to refresh expired Fitbit access token'));
                        }
                        
                        profile.oauthAccessToken = token.access_token;
                        profile.oauthRefreshToken = token.refresh_token;
                        Profile.update(profile);
                        
                        return friendlyRequest();
                    });
                }
            }
            
            if (results[1].statusCode != 200) {
                console.error('Failed');
                return next(new Error('Failed to retrieve Fitbit timeseries results[0]'));
            }
    
            console.log('Succeeded');
    
            return results[0];
        });
    };
    
    return friendlyRequest();
}

exports.getActivities = function(Profile, profile, next) {
    console.log('Attempting to fetch activity stats for ' + profile.id);

    var client = new FitbitApiClient(process.env.FITBIT_CLIENT_ID, process.env.FITBIT_CLIENT_SECRET);

    var maxRequests = 2;
        
    var friendlyRequest = function() {
        maxRequests--;
        
        return client.get('/activities/date/today.json', profile.oauthAccessToken).then(function(results) {
            if (results[1].statusCode == 401) {
                console.log('Access token expired for ' + profile.id);
                
                if (maxRequests > 0) {
                    console.log('Refreshing access token for ' + profile.id);
                    
                    return client.refreshAccesstoken(profile.oauthRefreshToken).then(function(token) {
                        if (results[1].statusCode != 200) {                
                            console.error('Failed');
                            return next(new Error('Failed to refresh expired Fitbit access token'));
                        }
                        
                        profile.oauthAccessToken = token.access_token;
                        profile.oauthRefreshToken = token.refresh_token;
                        Profile.update(profile);
                        
                        return friendlyRequest();
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
    
    return friendlyRequest();
}
