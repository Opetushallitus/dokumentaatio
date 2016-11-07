#!/usr/bin/env node
"use strict";

var serverState = {
  workDir: process.argv[2],
  projectInfos: [], urlProperties : {},
  scanInfo: {}
}

if(!serverState.workDir) {
  console.log("Please define work directory")
  process.exit(1);
}

var express = require('express')
var exphbs  = require('express-handlebars');

var scan = require('./lib/scan.js')

var app = express();
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

function reload(fn) {
  scan.scan(serverState, fn)
}

startServer()
reload()
setInterval(reload, 15 * 60000)

function startServer() {
  function json(res) { res.setHeader("Content-Type", "application/json"); }
  function text(res) { res.setHeader("Content-Type", "text/plain"); }

  app.get('/project_infos.md', function(req, res){
    text(res)
    res.render("project_infos_md", {layout: false, data: convert.generateProjectInfoTable(serverState.projectInfos)})
  });

  app.get('/rest/project_infos', function(req, res){
    json(res)
    res.json(convert.generateProjectInfoTable(serverState.projectInfos))
  });

  app.get('/rest/project_infos/uses', function(req, res){
    json(res)
    res.json(convert.collectProjectInfoSummary(serverState.projectInfos))
  });

  app.get('/rest/url_properties', function(req, res){
    json(res)
    res.json(serverState.urlProperties)
  });

  app.get('/rest/url_properties/uses', function(req, res){
    json(res)
    res.json(convert.collectProjectInfoSummary(convert.convertUrlPropertiesToProjectInfo(serverState.urlProperties)))
  });

  app.get('/rest/server_state', function(req, res){
    json(res)
    res.json(serverState)
  });

  app.get('/rest/server_state/scaninfo', function(req, res){
    json(res)
    res.json(serverState.scanInfo)
  });

  app.get('/rest/reload', function(req, res){
    json(res)
    reload(function(){
      res.json({"message": "Project_infos: " + serverState.projectInfos.length + " Url_properties: " + Object.keys(serverState.urlProperties)})
    })
  });

  app.post('/quit', function(req, res){
    setTimeout(function(){process.exit(0)}, 20)
    res.send("Quitting in 20ms...\n")
  })

  var publicdir = __dirname + '/static';
  app.use(express.static(publicdir));

  var appPort = process.env.PORT || 20102
  console.log("Server listening at http://localhost:" + appPort)
  app.listen(appPort);
}