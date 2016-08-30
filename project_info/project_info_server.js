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

function flattenNested(obj, dest, keyprefix) {
  if(!dest) {
    dest = {}
  }
  Object.keys(obj).forEach(function(key){
    var val = obj[key];
    var newkey = key
    if(keyprefix) {
      newkey = keyprefix + "." + key;
    }
    if(typeof val === 'string') {
      dest[newkey] = val
    } else {
      flattenNested(val, dest, newkey)
    }
  })
  return dest
}

function parseProperties(f, originalFileContent) {
  var suffix = f.substr(f.lastIndexOf('.'))
  if (suffix === ".properties") {
    return prop.read(f)
  } else if (suffix == ".json") {
    return JSON.parse(originalFileContent)
  } else if (suffix == ".js") {
    // f contains code that sets module.exports (es5) or export default (es6)
    var fStr = originalFileContent.replace("export default", "module.exports=")
    var evalWindowStr = "(function() {var module={exports:null};var window={urls: {}};\n" + fStr + "\n;return {moduleExports: module.exports, windowUrls: window.urls};})();"
    var result = eval(evalWindowStr);
    return result.moduleExports || result.windowUrls.override || result.windowUrls.properties || window.urls.defaults;
  }
  throw new Error("Unsupported file format: " + f + " with suffix " + suffix)
}

function scanUrlProperties(fn) {
  url_properties = {}
  var prefixes = [
    "*url.properties", "*oph.properties",
    "*url_properties.json", "*oph_properties.json", "*oph.json",
    "*oph_properties.js", "*oph.js"]
  var p = path.join(dir, "**/+("+prefixes.join("|")+")")
  console.log("Scanning for files matching " + p)
  glob(p, function (er, files) {
    files.forEach(function(filePath){
      try {
        var filename = filePath.substr(filePath.lastIndexOf('/') + 1)
        var postfix = filename.lastIndexOf("url") != -1 ? "url" : "oph"
        var project = filename.substring(0, filename.lastIndexOf(postfix) - 1)
        var originalFileContent = fs.readFileSync(filePath, 'utf8')
        var properties = parseProperties(filePath, originalFileContent);

        if (properties) {
          var urlPropertyInfo = {
            name: project,
            properties: flattenNested(properties),
            path: filePath,
            originalFileContent: originalFileContent
            };
            url_properties[project] = urlPropertyInfo
        } else {
          console.log(filePath, "does not include url_properties:", originalFileContent)
        }
      } catch(err) {
        console.log("Error processing file: " + filePath + ": ", err)
      }
    })
    console.log("read url_properties from " + files.join(", "))
    if(fn) {
      fn()
    }
  })
}

function generate_project_info_from_url_properties() {
  return Object.keys(url_properties).map(function(project){
    var s2sInfo = {}
    var urlPropertyInfo = url_properties[project];
    var properties = urlPropertyInfo.properties
    var used_services = Object.keys(properties)
      .filter(function(key) {
        return key.indexOf(".") > 0
      })
      .map(function(key) {
        var destService = key.substring(0,key.indexOf("."));
        var s2sKey = project + "." + destService;
        s2sInfo[s2sKey] = (s2sInfo[s2sKey] || [])
        s2sInfo[s2sKey].push(key + "=" + properties[key])
        return destService
      })
    return merge({
      uses: uniq(used_services).join(" "),
      service2service : s2sInfo
    }, urlPropertyInfo)
  })
}

function merge(dest, from) {
  Object.keys(from).forEach(function(key){
    dest[key]=from[key];
  })
  return dest
}

function resolve_uses(project_info_list) {
  var uses = {}, used_by = {}, items = [];
  var service2service = {}
  var project_info_map = {}
  function add(j) {
    if(j.uses && j.name) {
      var name = j.name
      var usedServicesAsArr = j.uses.split(" ")
      uses[name] = usedServicesAsArr
      items.push(name)
      usedServicesAsArr.forEach(function(u){
        items.push(u)
        if(!used_by[u]) {
          used_by[u] = []
        }
        used_by[u].push(name)
      })
      merge(service2service, j.service2service || {})
    }
  }
  project_info_list.forEach(function(i){
    add(i);
    (i["projects"] || []).forEach(add)
    project_info_map[i.name]=i
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
    name_id_map: name_id_map,
    service2service: service2service,
    project_infos: project_info_map
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

startServer()
reload()
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