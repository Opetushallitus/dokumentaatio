var safeEval = require('safe-eval')
var util = require('../static/util.js')
var fileutil = require('./fileutil.js')
var spring = require('./spring-support.js')
var urlparsers = require('./urlparsers.js')
require("./polyfills.js")

var scan = {}
module.exports = scan

scan.scan = function (serverState, fn) {
  console.log("Scanning", serverState.workDir)
  var start = (new Date).getTime()
  fileutil.fileTree(serverState.workDir, function (er, fileTree) {
    if (serverState.scanInfo) {
      if (serverState.scanInfo.latestScan) {
        console.log("There is a scan running which started at ", serverState.scanInfo.latestScan, " aborting new scan...")
        return
      } else {
        serverState.scanInfo.latestScan = start
      }
    }
    var state = {
      workDir: serverState.workDir,
      scanInfo: {
        errors: [],
        duration: 0,
        start: new Date().toString()
      },
      sources: []
    }
    scanProjectInfoJsonFiles(fileTree, state)
    scanUrlProperties(fileTree, state)
    spring.scanForJaxUrls(fileTree, state)
    urlparsers.parseUrlConfigs(fileTree, state)
    state.scanInfo.duration = (new Date).getTime() - start
    util.copyMap(state, serverState)
    console.log("Parsed", util.sourceFileList(state).length, "files")
    if (state.scanInfo.errors.length > 0) {
      console.log("Errors", state.scanInfo.errors.length, ":", state.scanInfo.errors)
    }
    if (fn) {
      fn()
    }
  })
}

// reads JSON files matching workDir/**/*project_info.json
// project_info.json is just a map of values and is shown in an excel like table per project
// {name: "Test", makeFile: "Yes"}
// Project | makeFile
// Test    | Yes
function scanProjectInfoJsonFiles(fileTree, serverState) {
  var files = fileTree.filesBySuffix("project_info.json")
  return files.map(function (filePath) {
    var ret = fileutil.readJSON(fileTree.fullPath(filePath));
    ret.sources = [
      {
        path: filePath
      }]
    // backwards compatability
    if (ret.uses && !Array.isArray(ret.uses)) {
      ret.uses = ret.uses.split(" ")
    }
    serverState.sources.push(ret)
  })
}

function parseJSON(originalFileContent) {
  return JSON.parse(originalFileContent)
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


var urlPropertiesSuffixes = ["oph.properties", "url.properties", "oph.json", "oph_properties.json", "url_properties.json", "oph.js", "oph_properties.js", "url_properties.js"];
scan.supportedFileSuffixes = urlPropertiesSuffixes.concat("project_info.json");

// scans for .properties .json and .js files and loads them in to urlProperties
// creates a list of project_info kind of map with {name: .. properties: .. path: .. originalFileContent: ..}
function scanUrlProperties(fileTree, serverState) {

  // parse based on file suffix
  function parse(filePath, originalFileContent) {
    if (filePath.endsWith(".js")) {
      return evalJS(originalFileContent)
    } else if (filePath.endsWith(".json")) {
      return parseJSON(originalFileContent)
    } else if (filePath.endsWith(".properties")) {
      return fileutil.parseProperties(originalFileContent);
    }
  }

  fileTree.filesBySuffix(urlPropertiesSuffixes).forEach(function (filePath) {
    try {
      // figure out project from filename
      var filename = filePath.substr(filePath.lastIndexOf('/') + 1)
      var postfix = filename.lastIndexOf("url") != -1 ? "url" : "oph"
      var project = filename.substring(0, filename.lastIndexOf(postfix) - 1)
      if (project != "") {
        var originalFileContent = fileutil.read(fileTree.fullPath(filePath));
        var properties = parse(filePath, originalFileContent);
          var sourceInfo = {
            name: project,
            properties: util.flattenNested(properties || {}),
            sources: [
              {
                path: filePath,
                content: originalFileContent
              }]
          };
          serverState.sources.push(sourceInfo)
        if (!properties || util.isEmptyObject(properties)) {
          serverState.scanInfo.errors.push(filePath + " does not include url_properties: " + originalFileContent)
        }
      }
    } catch (err) {
      serverState.scanInfo.errors.push("Error processing file: " + filePath + ": " + err)
    }
  })
}

