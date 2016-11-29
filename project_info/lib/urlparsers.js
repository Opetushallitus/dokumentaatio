var xml2js = require('xml2js')
var util = require('../static/util.js')
var fileutil = require('./fileutil.js')
var Path = require('path')

var urlParsers = {}
module.exports = urlParsers

urlParsers.parseUrlConfigs = function (fileTree, serverState) {
  var projectInfos = util.values(util.combineSourcesToProjectInfoMap(serverState.sources))
  projectInfos.forEach(function (projectInfo) {
    var project = projectInfo.name
    var urlConfigs = projectInfo["url-config"];
    if (project && urlConfigs && urlConfigs.length > 0) {
      urlConfigs.forEach(function (urlConfig) {
        var filePath = projectInfo.sources[0].path;
        var root = filePath
        if (!root) {
          throw "Can't resolve root directory for " + JSON.stringify(projectInfo)
        }
        function resolveFullPath(filePath) {
          return Path.join(serverState.workDir, Path.dirname(root), filePath)
        }
        function resolveProjectPath(filePath) {
          return Path.join(Path.dirname(root), filePath)
        }
        if (!urlConfig.path || !urlConfig["values-for-key"]) {
          serverState.scanInfo.errors.push("Project " + projectInfo.name + " has bad url-config: " + JSON.stringify(urlConfig, null, 2))
        } else {
          util.flatten(resolveFullPath(urlConfig.path)).forEach(function (jsonPath) {
            var originalFileContent = fileutil.read(jsonPath)
            var sourceProperties = JSON.parse(originalFileContent)
            var parsedValues = util.safeCollect(sourceProperties, urlConfig["values-for-key"])
            var parsedProperties = util.groupBy(parsedValues, util.resolveKeyForRelativeUrl, false)
            var source = {
              name: project,
              properties: parsedProperties,
              sources: [
                {
                  path: resolveProjectPath(urlConfig.path),
                  content: originalFileContent
                }]
            };
            serverState.sources.push(source)
          })
        }
      })
    }
  })
}

