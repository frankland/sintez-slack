import https from 'https';
import querystring from 'querystring';

import BaseEvents from 'base-events';


const SLACK_API_PROTOCOL = 'https:';
const SLACK_API_HOST = 'api.slack.com';
const SLACK_API_BASE = 'api';
const SLACK_API_METHOD = 'POST';


const _token = Symbol('slack-token');
const _channel = Symbol('slack-channel');

// slacker :D
class Slacker extends BaseEvents {
  constructor(key, config) {
    super();

    this[_token] = config.token;
    this[_channel] = config.channel;

    if (!this[_token] || !this[_channel]) {
      throw new Error('token and chanel are required for sintez-slack');
    }
  }

  api(method, data) {
    let normalized = Object.assign({}, data, {
      token: this[_token]
    });

    let postData = querystring.stringify(normalized);

    return new Promise((resolve, reject) => {
      let req = https.request({
        //protocol: SLACK_API_PROTOCOL,
        host: SLACK_API_HOST,
        method: SLACK_API_METHOD,
        path: `/${SLACK_API_BASE}/${method}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length
        }
      });

      req.on('response', res => {
        let buffer = '';
        res.on('data', chunk => buffer += chunk);

        return res.on('end', () => {
          let code = res.statusCode;
          let json = JSON.parse(buffer);

          if (code === 200) {
            if (json.ok) {
              resolve(json.stuff);
            } else {
              reject(json.error);
            }
          } else {
            reject(`response code: ${code}`);
          }
        });
      });

      req.on('error', error => reject(error));
      req.write(postData);
    });
  }

  message(message) {
    return this.api('chat.postMessage', {
      text: message,
      channel: this[_channel],
      pretty: 1,
      as_user: true
    }).then((stuff) => {

      this.emit('message.done', {
        message,
        stuff
      });

    }).catch(error => {

      this.emit('message.error', {
        error
      });

    })
  }
}

module.exports = (key, config) => {
  return new Slacker(key, config);
};
