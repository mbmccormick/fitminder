var TwilioApiClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendMessage = function(profile, message, next) {
    console.log('Attempting to send message to ' + profile.phoneNumber);

    return TwilioApiClient.sendMessage({
            to: profile.phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
            body: message
        }, function(err, responseData) {
            if (err) {
                console.error('Failed');
                return next(err);
            }

            console.log('Succeeded');
        }
    );
}

exports.sendGenericMessage = function(phoneNumber, message, next) {
    console.log('Attempting to send generic message to ' + phoneNumber);

    return TwilioApiClient.sendMessage({
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
            body: message
        }, function(err, responseData) {
            if (err) {
                console.error('Failed');
                return next(err);
            }

            console.log('Succeeded');
        }
    );
}
