var request = require('request');
var q = require('q');

exports.sendEvent = function(profile, value1, value2, value3, next) {
    console.log('Attempting to send IFTTT event to ' + profile.iftttSecretKey);

    var deferred = q.defer();

    request.post('https://maker.ifttt.com/trigger/fitminder/with/key/' + profile.iftttSecretKey, {
		form: {
			value1: value1,
			value2: value2,
			value3: value3
		}
	}, function(err, response, body) {
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
