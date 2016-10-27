var glob = require("glob")
var Path = require('path')
var safeEval = require('safe-eval')
var util = require('./util.js')
var spring = require('./spring-support.js')

var scan = {
  scan: function (serverState, fn) {
    console.log("Scanning", serverState.workDir)
    scanFileTree(serverState.workDir, function (er, fileTree) {
      var start = (new Date).getTime()
      var state = {
        workDir: serverState.workDir,
        scanInfo: {
          files: [],
          errors: [],
          duration: 0,
          start: new Date().toString()
        },
        urlProperties: {}
      }
      state.projectInfos = scanProjectInfoJsonFiles(fileTree, state.scanInfo)
      scanUrlProperties(fileTree, state.scanInfo, state.urlProperties)
      spring.scanForJaxUrls(state, fileTree)
      state.scanInfo.duration=(new Date).getTime() - start
      util.copyMap(state, serverState)
      console.log("Parsed", state.scanInfo.files.length, "files")
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

scanFileTree = function(root, fn) {
  var p = Path.join(root, "**/*")
  glob(p, function (er, files) {
    fn(er, util.createFileTree(root, files))
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
  return files.map(function(filePath){ var ret = readJSON(filePath); ret.path=filePath; return ret})
}

function parseJSON(originalFileContent) {
  return JSON.parse(originalFileContent)
}

function readJSON(filePath) {
  return parseJSON(util.read(filePath))
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
function scanUrlProperties(fileTree, info, urlProperties) {
  function parse(fileSuffixes, fn) {
    return fileTree.filesBySuffix(fileSuffixes).forEach(function (filePath) {
      try {
        var filename = filePath.substr(filePath.lastIndexOf('/') + 1)
        var postfix = filename.lastIndexOf("url") != -1 ? "url" : "oph"
        var project = filename.substring(0, filename.lastIndexOf(postfix) - 1)
        if (project != "") {
          var originalFileContent = util.read(filePath);
          var properties = fn(originalFileContent);

          if (properties) {
            util.addUrlProperties(urlProperties, project, properties, originalFileContent, filePath)
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

  parse(["oph.properties", "url.properties"], util.parseProperties)
  parse(["oph.json", "oph_properties.json", "*url_properties.json"], parseJSON)
  parse(["oph.js", "oph_properties.js"], evalJS)
}
