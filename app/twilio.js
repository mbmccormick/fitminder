var TwilioApiClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendMessage = function(phoneNumber, message) {
    TwilioApiClient.sendMessage({
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
            body: message
        }, function(err, responseData) {
            // log errors to console
            if (err) {
                console.log('ERROR: twilio.sendMessage');
                console.log(err);
            }
        }
    );
}