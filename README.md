# Fitminder



Fitminder provides encouragement to help you stick to your goals. It's a simple web application that monitors your Fitbit activity and sends you a text message when you haven't moved for a while. It's an Idle Alert, for your Fitbit.



## How It Works



When a user connects their Fitbit account to Fitminder, it registers a subscription with the Fitbit API for any changes to the user's activities resources. When a user syncs their Fitbit with their PC or their mobile device, Fitbit sends Fitminder a message, notifying the application that there is new activity data for the user. When Fitminder receives this notification, it makes a call to the Fitbit API to fetch the user's timeseries data. Fitminder analyzes this data for periods of inactivity and if it determines that the user has been sitting idle for too long, it sends them a text message using Twilio.




## Roadmap



You can find the roadmap for Fitminder on Trello. There you can submit new feature ideas, vote on existing ideas, file bugs, and keep track of what's coming for Fitminder.



https://trello.com/b/ahryeCP3/fitminder



## License



This software, and its dependencies, are distributed free of charge and licensed under the GNU General Public License v2. For more information about this license and the terms of use of this software, please review the LICENSE.txt file.
