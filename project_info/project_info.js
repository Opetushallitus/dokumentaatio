#!/usr/bin/env node
"use strict";

var dir = process.argv[2]

if(!dir) {
  console.log("Please define work directory")
  process.exit(1);
}

var express = require('express')
var glob = require("glob")
var path = require('path')
var fs = require('fs')
var exphbs  = require('express-handlebars');

var app = express();
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

var project_infos = [];

function reload(fn) {
  var p = path.join(dir, "**/project_info*.json")
  console.log("Scanning for files matching " + p)
  glob(p, function (er, files) {
    project_infos = files.map(function(f){ return JSON.parse(fs.readFileSync(f, 'utf8'))})
    console.log("read project_infos from " + files)
    fn()
  })
}

function resolve_uses() {
  var uses = {}, used_by = {}, items = [];
  function add(j) {
    if(j.uses && j.name) {
      var name = j.name
      var arr = j.uses.split(" ")
      uses[name] = arr
      items.push(name)
      arr.forEach(function(u){
        items.push(u)
        if(!used_by[u]) {
          used_by[u] = []
        }
        used_by[u].push(name)
      })
    }
  }
  project_infos.forEach(function(i){
    add(i);
    (i["projects"] || []).forEach(add)
  })
  items = uniq(items)
  var id_name_map = {}, name_id_map = {};
  items.forEach(function(name, i){
    id_name_map[i]=name
    name_id_map[name]=i   
  })
  return {
    uses: uses,
    used_by: used_by,
    items: items,
    id_name_map: id_name_map,
    name_id_map: name_id_map
  }
}

function resolve_project_infos_and_fields() {
  var fields = [];
  project_infos.forEach(function(i){
    for (var property in i) {
      if (i.hasOwnProperty(property) && fields.indexOf(property) === -1) {
        fields.push(property)
      }
    }    
  })
  return {
    project_infos: project_infos,
    fields: fields
  }
}

function uniq(arr) {
  return arr.reverse().filter(function (e, i, arr) {
    return arr.indexOf(e, i+1) === -1;
  }).reverse();
}

reload(startServer);

function startServer() {
  function jsonResponse(res) { res.setHeader("Content-Type", "application/json"); }

  app.get('/filter_table.html', function(req, res){
    res.render("filter_table", {title: "project_info.json", data: resolve_project_infos_and_fields()})
  });

  app.get('/rest/project_infos', function(req, res){
    res.json(resolve_project_infos_and_fields())
  });

  app.get('/rest/uses', function(req, res){
    res.json(resolve_uses())
  });

  app.get('/rest/reload', function(req, res){
    reload(function(){
      res.json({"message": "Project_infos: " + project_infos.length})
    })
  });

  var publicdir = __dirname + '/static';
  app.use(express.static(publicdir));

  var appPort = process.env.PORT || 20102
  console.log("Server listening at http://localhost:" + appPort)
  app.listen(appPort);
}