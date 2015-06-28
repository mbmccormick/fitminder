var stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createCharge = function(profile, token, next) {
    console.log('Attempting to create charge for ' + profile.encodedId);
    
    return stripe.charges.create({
            amount: 1000,
            currency: "usd",
            source: token,
            description: "Fitminder - Annual Fee",
            metadata: {
                'encodedId': profile.encodedId
            }
        }, function(err, charge) {
            if (err) {
                console.error('Failed');
                return next(err);
            }
            
            console.log('Succeeded');
            
            return charge;
        }
    );
}
