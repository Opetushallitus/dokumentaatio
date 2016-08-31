#!/usr/bin/env node
"use strict";

var workDir = process.argv[2]

if(!workDir) {
  console.log("Please define work directory")
  process.exit(1);
}

var express = require('express')
var glob = require("glob")
var path = require('path')
var fs = require('fs')
var exphbs  = require('express-handlebars');
var PropertiesParser = require('properties-parser')

var app = express();
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

var serverState = {
  projectInfos: [], urlProperties : {}
}

function reload(fn) {
  scanProjectInfos(function(){scanUrlProperties(fn)})
}

// reads JSON files matching workDir/**/*project_info.json
// project_info.json is just a map of values and is shown in an excel like table per project
// {name: "Test", makeFile: "Yes"}
// Project | makeFile
// Test    | Yes
function scanProjectInfos(fn) {
  var p = path.join(workDir, "**/*project_info.json")
  console.log("Scanning for files matching " + p)
  glob(p, function (er, files) {
    serverState.projectInfos = files.map(function(f){ return JSON.parse(fs.readFileSync(f, 'utf8'))})
    console.log("read project_infos from " + files)
    fn()
  })
}

// flattens nested map by concatenating keys with commas
// {test: {map: {key: value}}} -> {"test.map.key": value}
// note: supports only strings or maps as values
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

// parses properties from .properties .json and .js files
function parseProperties(filepath, originalFileContent) {
  var suffix = filepath.substr(filepath.lastIndexOf('.'))
  if (suffix === ".properties") {
    return PropertiesParser.read(filepath)
  } else if (suffix == ".json") {
    return JSON.parse(originalFileContent)
  } else if (suffix == ".js") {
    // file contains code that sets module.exports (es5) or export default (es6). replace converts es6 to es5
    var fStr = originalFileContent.replace("export default", "module.exports=")
    // eval inside function for security, inspect values returned from eval's result
    var evalWindowStr = "(function() {var module={exports:null};var window={urls: {}};\n" + fStr + "\n;return {moduleExports: module.exports, windowUrls: window.urls};})();"
    var result = eval(evalWindowStr);
    // eval result might contain result.moduleExports (es6) or result.windowUrls (es5)
    return result.moduleExports || result.windowUrls.override || result.windowUrls.properties || window.urls.defaults;
  }
  throw new Error("Unsupported file format: " + filepath + " with suffix " + suffix)
}

// scans for .properties .json and .js files and loads them in to urlProperties
// creates a list of project_info kind of map with {name: .. properties: .. path: .. originalFileContent: ..}
function scanUrlProperties(fn) {
  var scannedProperties = {}
  var prefixes = [
    "*oph.properties", "*oph.json", "*oph.js", "*url.properties", // preferred suffixes
    "*url_properties.json", "*oph_properties.json", "*oph_properties.js"
  ]
  var p = path.join(workDir, "**/+("+prefixes.join("|")+")")
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
            scannedProperties[project] = urlPropertyInfo
        } else {
          console.log(filePath, "does not include url_properties:", originalFileContent)
        }
      } catch(err) {
        console.log("Error processing file: " + filePath + ": ", err)
      }
    })
    console.log("read url_properties from " + files.join(", "))
    serverState.urlProperties = scannedProperties
    if(fn) {
      fn()
    }
  })
}

// convert url properties to project info
// collects "uses" and "service2service" information from flattened "properties"
// "service2service" groups properties by {"thisProject.destProject": ["key=value"]}
function appendUsesAndS2SInfoToUrlProperties(urlProperties) {
  return Object.keys(urlProperties).map(function(project){
    var s2sInfo = {}
    var urlPropertyInfo = urlProperties[project];
    var properties = urlPropertyInfo.properties
    var usedServices = []
    Object.keys(properties)
      // ignore keys without .
      .filter(function(key) {
        return key.indexOf(".") > 0
      })
      .forEach(function(key) {
        var destService = key.substring(0,key.indexOf("."));
        var s2sKey = project + "." + destService;
        s2sInfo[s2sKey] = (s2sInfo[s2sKey] || [])
        s2sInfo[s2sKey].push(key + "=" + properties[key])
        usedServices.push(destService)
      })
    return copyMap(urlPropertyInfo, {
        uses: uniq(usedServices).join(" "),
        service2service: s2sInfo
    })
  })
}

function copyMap(from, target) {
  Object.keys(from).forEach(function(key){
    target[key]=from[key];
  })
  return target
}

// walks through the projectInfoList and collects information that is used to generate the graph
function createGraphInfoFromProjectInfos(projectInfoList) {
  var allData = {
    // use information, by project.name
    uses : {}, used_by : {},
    // list of project.names
    items: [],
    // maps for project.name's id in items
    id_name_map: {}, name_id_map: {},
    // lists each myProject.destProject dependency and the original property value {"thisProject.destProject": ["key=value"]}
    service2service: {},
    // project_info list in map, key = project.name
    project_infos: {}
  };

  function add(projectInfo) {
    if(projectInfo.uses && projectInfo.name) {
      var name = projectInfo.name
      var usedServicesAsArr = projectInfo.uses.split(" ");
      allData.uses[name] = usedServicesAsArr
      allData.items.push(name)
      usedServicesAsArr.forEach(function(u){
        allData.items.push(u)
        if(!allData.used_by[u]) {
          allData.used_by[u] = []
        }
        allData.used_by[u].push(name)
      })
      copyMap(projectInfo.service2service || {}, allData.service2service)
    }
  }
  // add information from every projectInfo and go through projectInfo.projects
  projectInfoList.forEach(function(projectInfo){
    add(projectInfo);
    (projectInfo["projects"] || []).forEach(add)
    allData.project_infos[projectInfo.name]=projectInfo
  });
  allData.items = uniq(allData.items)
  allData.items.forEach(function(name, index){
    allData.id_name_map[index]=name
    allData.name_id_map[name]=index
  })
  return allData
}

// generates map for showing the project info table
// {fields: ["name","makeFile"], project_infos:[{name: "Test", makeFile: "Yes"}]}
function resolveProjectInfoTable(projectInfos) {
  var fields = [];
  projectInfos.forEach(function(i){
    fields = fields.concat(Object.keys(i))
  })
  return {
    project_infos: projectInfos,
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
    res.render("project_infos_md", {layout: false, data: resolveProjectInfoTable(serverState.projectInfos)})
  });

  app.get('/rest/project_infos', function(req, res){
    json(res)
    res.json(resolveProjectInfoTable(serverState.projectInfos))
  });

  app.get('/rest/project_infos/uses', function(req, res){
    json(res)
    res.json(createGraphInfoFromProjectInfos(serverState.projectInfos))
  });

  app.get('/rest/url_properties', function(req, res){
    json(res)
    res.json(serverState.urlProperties)
  });

  app.get('/rest/url_properties/uses', function(req, res){
    json(res)
    res.json(createGraphInfoFromProjectInfos(appendUsesAndS2SInfoToUrlProperties(serverState.urlProperties)))
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