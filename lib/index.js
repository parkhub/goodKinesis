'use strict';

/*
*   Author: Trace Baxter @ParkHub
*
*   This is a plugin for excepting Hapi events through Good
*   and pushing them onto a kinesis queue.
*
*   To get started add this module as you would any Good reporter
*   The options available to you are:
*     - tags: tags to add to message for logging purposes
*     - interval: set how often you would like to send your messages defaults 600000ms (10 min)
*     - threshold: set how many messages you would like to send at once defaults 10
*     - retryTime: set how long to wait to retry sending messages defaults to 0 (doesn't retry)
*     - partitionKey: Kinesis param **REQUIRED**
*     - streamName: Kinesis param  **REQUIRED**
*     - explicitHashKey: Kineses param
*     - sequenceNumberForOrdering: Kinesis param
*/


const Stream = require('stream');
const AWS = require('aws-sdk/clients/kinesis');
const Kinesis = new AWS({ region: process.env.AWS_S3_REGION, credentials: { accessKeyId: process.env.AWS_KINESIS_KEY, secretAccessKey: process.env.AWS_KINESIS_SECRET } });
const Assert = require('assert');

const defaults = { interval: 600000, threshold: 10, retryTime: 0 };

module.exports.GoodKinesis = class extends Stream.Writable {
  constructor(options) {

    Assert(typeof options.partitionKey === 'string', 'partitionKey required');
    Assert(typeof options.streamName === 'string', 'streamName required');
    super({ objectMode: true, decodeStrings: false });

    this._options = Object.assign({}, defaults, options);
    this._bufferStart = null;
    this._buffer = [];

    // If write stream from server is disconnected send messages
    this.once('finish', () => {
      this._sendMessages();
    });
  }

  // Map hapi event data fields to Loggly fields
  _write(data, encoding, callback) {
    console.log(data);
    data.tags = data.tags || [];
    data.tags = data.tags.concat(this._options.tags);

    this._buffer.push(data);

    if (this._bufferReady()) {
      this._sendMessages(callback);
    } else {
      if (!this._bufferStart) {
        this._bufferStart = Date.now();
      }

      setImmediate(callback);
    }
  }

  // Check if messages are ready to be sent
  _bufferReady() {
    if (this._buffer.length >= this._options.threshold)
      return true;

    if (this._options.interval && this._bufferStart
      && Date.now() - this._bufferStart >= this._options.interval) {
      return true;
    }
  }

  // Reset some variables
  _resetBuffer() {
    this._bufferStart = null;
    this._buffer = [];
  }

  // Retry if you want to
  _retry() {
    if (this._options.retryTime)
      setTimeout(() => this._sendMessages(), this._options.retryTime);
    else
      this._resetBuffer();
  }

  // Formats messages for sending through the loggly bulk api
  // then sends it to a kinesis stream
  _sendMessages(callback) {
    const params = {
      StreamName: this._options.streamName,
      PartitionKey: this._options.partitionKey,
      Data: JSON.stringify(this._buffer)
    };

    // for those kinesis badasses
    if (this._options.explicitHashKey)
      params.explicitHashKey = this._options.explicitHashKey;
    if (this._options.sequenceNumberForOrdering)
      params.sequenceNumberForOrdering = this._options.sequenceNumberForOrdering;

    Kinesis.putRecord(params, (err, data) => {
      if (err) {
        console.error(err);
        this._retry();
      }
      else this._resetBuffer();

      callback();
    });
  }
}