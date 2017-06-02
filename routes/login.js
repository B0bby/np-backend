var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var secrets = require('../secrets.js');
var router = express.Router();

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

router.get('/', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(secrets.stateKey(), state);

  // your application requests authorization
  
  var scope = 'user-read-private playlist-modify-private playlist-modify-public';  
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: secrets.client_id(),
      scope: scope,
      redirect_uri: secrets.redirect_uri(),
      state: state
    }));
});

module.exports = router;
