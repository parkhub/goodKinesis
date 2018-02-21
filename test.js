process.env.AWS_S3_REGION = 'us-east-1';
process.env.AWS_KINESIS_KEY = '123';
process.env.AWS_KINESIS_SECRET = '321';
const kinesis = require('./lib').GoodKinesis;

let k = new kinesis({threshold: 5,
                  tags: ['obe', 'server.settings.app.version', 'fox-services-testing'],
                  streamName: 'llVool',
                  partitionKey: '123'});

k._write({
  event: 'log',
  timestamp: 1519222686435,
  tags: ['info', 'db'],
  data: 'Configuring database',
  pid: 40
},
'utf8',
  () => console.log(k._buffer));
