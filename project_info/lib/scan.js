var glob = require("glob")
var path = require('path')
var fs = require('fs')
var PropertiesParser = require('properties-parser')
var safeEval = require('safe-eval')

var scan = { scan: function (serverState, fn) {
  scanProjectInfos(serverState, function(){scanUrlProperties(serverState, fn)})
}}
module.exports = scan

// reads JSON files matching workDir/**/*project_info.json
// project_info.json is just a map of values and is shown in an excel like table per project
// {name: "Test", makeFile: "Yes"}
// Project | makeFile
// Test    | Yes
function scanProjectInfos(serverState, fn) {
  var p = path.join(serverState.workDir, "**/*project_info.json")
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
    // safeEval for security
    var ctx = {
      module:{
        exports:null
      },
      window: {
        urls: {
          addProperties: function (props) {
            ctx.window.urls.properties = props
          },
          addOverride: function (props) {
            ctx.window.urls.override = props
          },
          addDefaults: function (props) {
            ctx.window.urls.defaults = props
          }
        }
      }
    }
    safeEval(fStr, ctx);
    // eval result might contain module.exports (es6) or window.urls.xxx (es5)
    return ctx.module.exports || ctx.window.urls.override || ctx.window.urls.properties || ctx.window.urls.defaults;
  }
  throw new Error("Unsupported file format: " + filepath + " with suffix " + suffix)
}

// scans for .properties .json and .js files and loads them in to urlProperties
// creates a list of project_info kind of map with {name: .. properties: .. path: .. originalFileContent: ..}
function scanUrlProperties(serverState, fn) {
  var scannedProperties = {}
  var prefixes = [
    "*oph.properties", "*oph.json", "*oph.js", "*url.properties", // preferred suffixes
    "*url_properties.json", "*oph_properties.json", "*oph_properties.js"
  ]
  var p = path.join(serverState.workDir, "**/+("+prefixes.join("|")+")")
  console.log("Scanning for files matching " + p)
  glob(p, function (er, files) {
    files.forEach(function(filePath){
      try {
        var filename = filePath.substr(filePath.lastIndexOf('/') + 1)
        var postfix = filename.lastIndexOf("url") != -1 ? "url" : "oph"
        var project = filename.substring(0, filename.lastIndexOf(postfix) - 1)
        if(project != "") {
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
