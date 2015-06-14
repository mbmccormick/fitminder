var TwilioApiClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendMessage = function(phoneNumber, message, next) {
    console.log('Attempting to send message to ' + phoneNumber);
    
    TwilioApiClient.sendMessage({
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
            body: message
        }, function(err, responseData) {
            if (err) {
                console.log('Failed');
                return next(err);
            }
            
            console.log('Succeeded');
        }
    );
}