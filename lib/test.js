const kinesis = require('./index.js').GoodKinesis;

let k = new kinesis({threshold: 1,
                  tags: ['obe', 'server.settings.app.version', 'fox-services-testing'],
                  streamName: 'llVool',
                  partitionKey: '123'});

console.log(k);