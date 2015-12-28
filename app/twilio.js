var TwilioApiClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
var q = require('q');

exports.sendMessage = function(profile, message, next) {
    console.log('Attempting to send message to ' + profile.phoneNumber);

    var deferred = q.defer();

    TwilioApiClient.sendMessage({
            to: profile.phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
            body: message
        }, function(err, responseData) {
            if (err) {
                console.error('Failed');
                
                deferred.reject(next(err));
            } else {
                console.log('Succeeded');
                
                deferred.resolve();
            }
        }
    );
    
    return deferred.promise;
}

exports.sendGenericMessage = function(phoneNumber, message, next) {
    console.log('Attempting to send generic message to ' + phoneNumber);

    var deferred = q.defer();

    TwilioApiClient.sendMessage({
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
            body: message
        }, function(err, responseData) {
            if (err) {
                console.error('Failed');
                
                deferred.reject(next(err));
            } else {
                console.log('Succeeded');
                
                deferred.resolve();
            }
        }
    );
    
    return deferred.promise;
}
