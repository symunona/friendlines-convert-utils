var utils = require('./convert-utils');
var fs = require('fs');

var jsonData = JSON.parse(fs.readFileSync('test.filtered.json'));

var userActivity = utils.userActivityByMonth(jsonData);
console.log(userActivity);