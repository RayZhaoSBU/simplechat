const moment = require('moment');

function formatMessage(username, avatar, text) {
  return {
    username,
    avatar,
    text,
    time: moment().format('MMMM Do YYYY, h:mm:ss a')
  };
}

module.exports = formatMessage;
