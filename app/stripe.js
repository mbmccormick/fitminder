var stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createCharge = function(profile, token, next) {
    console.log('Attempting to create charge for ' + profile.id);

    return stripe.charges.create({
            amount: 1200,
            currency: "usd",
            source: token,
            description: "Fitminder - 1 Year Membership",
            metadata: {
                'id': profile.id
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
