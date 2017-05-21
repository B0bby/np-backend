var express = require('express');
var request = require('request');

var app = express();
app.set('view engine', 'pug');
app.set('views', './views');

var seatgeekUrl = 'https://api.seatgeek.com/2/events?geoip=true&per_page=500&datetime_utc.gte=2017-05-22&datetime_utc.lte=2017-05-29&taxonomies.name=concert&taxonomies.name=concerts&client_id=NzU1ODIxMXwxNDk0NTQ4NzY2Ljk2';

var callback = require('./routes/callback.js');
app.use('/callback', callback);

var refresh_token = require('./routes/refresh_token.js');
app.use('/refresh_token', refresh_token);

var login = require('./routes/login.js');
app.use('/login', login);


app.get('/', (req, res) => {
  res.send("YO");
});

app.get('/home', (req, res) => {
  res.render('_shared', {
    result: result
  });

});

app.listen(3000);
