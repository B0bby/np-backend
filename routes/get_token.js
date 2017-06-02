var express = require('express'); 
var request = require('request'); 

var router = express.Router();

router.get('/', function(req, res) {
  request.get('http://192.168.1.164:3000/login', (err, response, body) => {
    console.log(response);
    res.send(body);
  })
})

module.exports = router;