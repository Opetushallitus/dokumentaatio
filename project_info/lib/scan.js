var glob = require("glob")
var path = require('path')
var fs = require('fs')
var PropertiesParser = require('properties-parser')
var safeEval = require('safe-eval')
var util = require('./util.js')

var scan = {
  scan: function (serverState, fn) {
    console.log("Scanning", serverState.workDir)
    scanFileTree(serverState.workDir, function (er, fileTree) {
      var state = {
        scanInfo: {
          files: [],
          errors: []
        },
      }
      state.projectInfos = scanProjectInfoJsonFiles(fileTree, state.scanInfo)
      state.urlProperties = scanUrlProperties(fileTree, state.scanInfo)
      util.copyMap(state, serverState)
      console.log("Parsed", state.scanInfo.files.length, "files:", state.scanInfo.files)
      if (state.scanInfo.errors.length > 0) {
        console.log("Errors", state.scanInfo.errors.length, ":", state.scanInfo.errors)
      }
      if (fn) {
        fn()
      }
    })
  }
}

module.exports = scan

function scanFileTree(root, fn) {
  var p = path.join(root, "**/*")
  glob(p, function (er, files) {
    var ret = {
      root: root,
      files: files,
      filesBySuffix: function () {
        var suffixes = util.flatten(Array.prototype.slice.call(arguments));
        return util.uniq(util.flatten(suffixes.map(function (suffix) {
          return ret.files.filter(function (file) {
            return file.endsWith(suffix)
          })
        })))
      }
    }
    fn(er, ret)
  })
}

// reads JSON files matching workDir/**/*project_info.json
// project_info.json is just a map of values and is shown in an excel like table per project
// {name: "Test", makeFile: "Yes"}
// Project | makeFile
// Test    | Yes
function scanProjectInfoJsonFiles(fileTree, info) {
  var files = fileTree.filesBySuffix("project_info.json")
  info.files = info.files.concat(files)
  return files.map(readJSON)
}

// flattens nested map by concatenating keys with commas
// {test: {map: {key: value}}} -> {"test.map.key": value}
// note: supports only strings or maps as values
function flattenNested(obj, dest, keyprefix) {
  if (!dest) {
    dest = {}
  }
  Object.keys(obj).forEach(function (key) {
    var val = obj[key];
    var newkey = key
    if (keyprefix) {
      newkey = keyprefix + "." + key;
    }
    if (typeof val === 'string') {
      dest[newkey] = val
    } else {
      flattenNested(val, dest, newkey)
    }
  })
  return dest
}

function parseProperties(originalFileContent) {
  return PropertiesParser.parse(originalFileContent)
}

function parseJSON(originalFileContent) {
  return JSON.parse(originalFileContent)
}

function readJSON(filePath) {
  return parseJSON(fs.readFileSync(filePath, 'utf8'))
}

function evalJS(originalFileContent) {
  // file contains code that sets module.exports (es5) or export default (es6). replace converts es6 to es5
  var fStr = originalFileContent.replace("export default", "module.exports=")
  // safeEval for security
  var ctx = {
    module: {
      exports: null
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

// scans for .properties .json and .js files and loads them in to urlProperties
// creates a list of project_info kind of map with {name: .. properties: .. path: .. originalFileContent: ..}
function scanUrlProperties(fileTree, info) {
  var scannedProperties = {}

  function parse(fileSuffixes, fn) {
    return fileTree.filesBySuffix(fileSuffixes).forEach(function (filePath) {
      try {
        var filename = filePath.substr(filePath.lastIndexOf('/') + 1)
        var postfix = filename.lastIndexOf("url") != -1 ? "url" : "oph"
        var project = filename.substring(0, filename.lastIndexOf(postfix) - 1)
        if (project != "") {
          var originalFileContent = fs.readFileSync(filePath, 'utf8');
          var properties = fn(originalFileContent);

          if (properties) {
            var urlPropertyInfo = {
              name: project,
              properties: flattenNested(properties),
              path: filePath,
              originalFileContent: originalFileContent
            };
            scannedProperties[project] = urlPropertyInfo
            info.files.push(filePath)
          } else {
            info.errors.push(filePath + " does not include url_properties: " + originalFileContent)
          }
        }
      } catch (err) {
        info.errors.push("Error processing file: " + filePath + ": " + err)
      }
    })
  }

  parse(["oph.properties", "url.properties"], parseProperties)
  parse(["oph.json", "oph_properties.json", "*url_properties.json"], parseJSON)
  parse(["oph.js", "oph_properties.js"], evalJS)
  return scannedProperties
}
