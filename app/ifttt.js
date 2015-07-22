var request = require('request');

exports.sendEvent = function(profile, value1, value2, value3, next) {
    console.log('Attempting to send IFTTT event to ' + profile.iftttSecretKey);
    
    request.post('https://maker.ifttt.com/trigger/fitminder/with/key/' + profile.iftttSecretKey, {
		form: {
			value1: value1,
			value2: value2,
			value3: value3
		}
	}, function(err, response, body) {
            if (err) {
                console.error('Failed');
                return next(err);
            }
            
            console.log('Succeeded');
        }
    );
}
