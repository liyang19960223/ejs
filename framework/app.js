http = require('http');

var sys = require('sys');
var fs = require('fs');
var fleegix = require('./fleegix');
var errors = require('./errors');

var Response = require('./response').Response;

var App = function (config) {
  var _this = this;

  this.config = config;
  this.router = config.router;
  this.controllers = config.controllers;
  this.req = null;
  this.resp = null;

  this.run = function (req, resp) {
    this.req = req;
    this.resp = resp;

    var url = req.url;
    var base = fleegix.url.getBase(url);
    var route = this.router.find(base);
    
    try {
      // If the route is a match, run the matching controller/action
      if (route) {
        var qs = fleegix.url.getQS(url);
        var qsParams = fleegix.url.qsToObject(qs);
        var params = fleegix.mixin(route.params, qsParams);

        // Instantiate the matching controller from the registry
        var constructor = this.controllers[route.controller];
        // Give it all the base Controller fu 
        constructor.prototype = new Controller(req, resp);
        var controller = new constructor();

        controller[route.action].call(controller, params);
      }
      else {
        // In dev mode, also serve static files
        if (config.environment = 'development') {
          var path = config.staticFilePath + req.url;
          fs.stat(path, function (err, stats) {
            // File not found, hand back the 404
            if (err) {
              var e = new errors.NotFoundError('Page ' + req.url + ' not found.');
              var r = new Response(resp);
              r.send(e.message, 'text/html', e.statusCode);
            }
            else {
              var r = new Response(resp);
              r.sendFile(path);
            }
          });
        }
        // Otherwise shoot back the 404
        else {
          throw new errors.NotFoundError('Page ' + req.url + ' not found.');
        }
      }
     }
     // Catch all errors, respond with error page & HTTP error code 
     catch (e) {
      var r = new Response(this.resp);
      r.send(e.message, 'text/html', e.statusCode);
     }
  }
};

var Controller = function (req, resp) {
  this.request = req;
  this.response = resp;
  this.content = '';
};

Controller.prototype = new function () {
  this.contentType = 'text/html'
  this.render = function (content) {
    if (typeof content != 'undefined') {
      this.content = content;
    }
    var r = new Response(this.response);
    r.send(this.content, this.contentType);
  };
}();

exports.App = App;
