
   This is a plugin for excepting Hapi events through Good
   and pushing them onto a kinesis queue. To get started add this module as you would any Good reporter.

   The options available to you are:

     - loggly: opt in to loggly formatting defaults true
     - interval: set how often you would like to send your messages defaults 600000ms (10 min)
     - threshold: set how many messages you would like to send at once defaults 10
     - retryTime: set how long to wait to retry sending messages defaults to 0 (doesn't retry)
     - partitionKey: Kinesis param **REQUIRED**
     - streamName: Kinesis param  **REQUIRED**
     - explicitHashKey: Kineses param
     - sequenceNumberForOrdering: Kinesis param
