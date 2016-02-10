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
var prop = require('properties-parser')

var app = express();
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

var project_infos = [], url_properties = {}

function reload(fn) {
  scanProjectInfos(fn)
}

function scanProjectInfos(fn) {
  var p = path.join(dir, "**/*project_info.json")
  console.log("Scanning for files matching " + p)
  glob(p, function (er, files) {
    project_infos = files.map(function(f){ return JSON.parse(fs.readFileSync(f, 'utf8'))})
    console.log("read project_infos from " + files)
    scanUrlProperties(fn)
  })
}

function scanUrlProperties(fn) {
  url_properties = {}
  var p = path.join(dir, "**/+(*url.properties|*url_properties.js)")
  console.log("Scanning for files matching " + p)
  glob(p, function (er, files) {
    files.forEach(function(f){
      var filename = f.substr(f.lastIndexOf('/') + 1)
      var project = filename.substring(0,filename.lastIndexOf("url")-1)
      var suffix = f.substr(f.lastIndexOf('.'))
      if(suffix === ".properties") {
        url_properties[project] = prop.read(f)
      } else {
        // f contains code that sets window.url
        var fStr = fs.readFileSync(f, 'utf8')
        var evalWindowStr = "(function() {var window={};" + fStr + ";return window;})();"
        url_properties[project] = eval(evalWindowStr).urls
      }
    })
    console.log("read url_properties from " + files)
    if(fn) {
      fn()
    }
  })
}

function generate_project_info_from_url_properties() {
  return Object.keys(url_properties).map(function(project){
    var used_services = Object.keys(url_properties[project]).map(function(key) {
      return key.substring(0,key.indexOf("."))
    })
    return {
      "name": project,
      "uses": uniq(used_services)
    }
  })
}

function resolve_uses(project_info_list) {
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
  project_info_list.forEach(function(i){
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
    fields = fields.concat(Object.keys(i))
  })
  return {
    project_infos: project_infos,
    fields: uniq(fields)
  }
}

function uniq(arr) {
  return arr.reverse().filter(function (e, i, arr) {
    return arr.indexOf(e, i+1) === -1;
  }).reverse();
}

reload(startServer);
setInterval(reload, 15 * 60000)

function startServer() {
  function json(res) { res.setHeader("Content-Type", "application/json"); }
  function text(res) { res.setHeader("Content-Type", "text/plain"); }

  app.get('/project_infos.md', function(req, res){
    text(res)
    res.render("project_infos_md", {layout: false, data: resolve_project_infos_and_fields()})
  });

  app.get('/rest/project_infos', function(req, res){
    json(res)
    res.json(resolve_project_infos_and_fields())
  });

  app.get('/rest/project_infos/uses', function(req, res){
    json(res)
    res.json(resolve_uses(project_infos))
  });

  app.get('/rest/url_properties', function(req, res){
    json(res)
    res.json(url_properties)
  });

  app.get('/rest/url_properties/uses', function(req, res){
    json(res)
    res.json(resolve_uses(generate_project_info_from_url_properties()))
  });

  app.get('/rest/reload', function(req, res){
    json(res)
    reload(function(){
      res.json({"message": "Project_infos: " + project_infos.length + " Url_properties: " + Object.keys(url_properties)})
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