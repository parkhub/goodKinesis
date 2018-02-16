'use strict';

/*
*   Author: Trace Baxter @ParkHub
*
*   This is a plugin for excepting Hapi events through Good
*   and pushing them onto a kinesis queue.
*
*   To get started add this module as you would any Good reporter
*   The options available to you are:
*     - loggly: opt in to loggly formatting defaults true
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
const Kinesis = require('aws-sdk/clients/kinesis');
const Assert = require('assert');

const defaults = {loggly: true, interval: 600000, threshold: 10, retryTime: 0};

class GoodKinesis extends Stream.Writable {
  constructor(options) {

    Assert(typeof options.partitionKey === 'string', 'partitionKey required');
    Assert(typeof options.streamName === 'string', 'streamName required');

    this._options = Object.assign({}, defaults, options);
    this._bufferStart = null;
    this._buffer = [];
    super({objectMode: true, decodeStrings: false});

    // If write stream from server is disconnected send messages
    this.once('finish', () => {
      this._sendMessages();
    });
  }

  // Map hapi event data fields to Loggly fields
  _write(data, encoding, callback) {

    if(this._options.loggly) this._format(data);

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
    if(this._buffer.length >= this._options.threshold)
      return true;

    if(this._options.interval && this._bufferStart
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
    if(this._options.retryTime)
      setTimeout(() => this._sendMessages(), this._options.retryTime);
    else
      this._resetBuffer();
  }

  // Some formatting because this will eventually be sent to loggly
  _formatMessage(data) {
    data.timestamp = new Date(timestamp).toISOString();
    data.msg = data.data ? data.data.message || data.data.error || data.data : '';
    data.tags = data.tags || data.data.tags || [];
    data.tags.concat(this._options.tags);
  }

  // Formats messages for sending through the loggly bulk api
  // then sends it to a kinesis stream
  _sendMessages(callback) {
    const params = {
      streamName: this._options.streamName,
      partitionKey: this._options.partitionKey,
      data: this._buffer
    };

    // for those kinesis badasses
    if(this._options.explicitHashKey)
      params.explicitHashKey = this._options.explicitHashKey;
    if (this._options.sequenceNumberForOrdering)
      params.sequenceNumberForOrdering = this._options.sequenceNumberForOrdering;

    Kinesis.putRecords(params, (err, data) => {
      if(err) {
        console.error(err);
        this._retry();
      }
      else this._resetBuffer();

      callback();
    });
  }
}

module.exports = GoodKinesis;