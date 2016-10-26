var xml2js = require('xml2js')
var util = require('../lib/util.js')
var path = require('path')
var spring = {}

module.exports = spring

spring.scanForJaxUrls = function(serverState, fileTree) {
  processProjectInfoList(serverState.projectInfos, serverState, fileTree.createFileLookupFn())
}

function processProjectInfoList(list, serverState, fileLookupFn, pathRoot) {
  list.forEach(function (projectInfo) {
    var root = projectInfo.path || pathRoot
    if(!root) {
      throw "Can't resolve root directory for " + JSON.stringify(projectInfo)
    }
    function relativePath(filePath) {
      return path.join(path.dirname(root), filePath)
    }
    var project = projectInfo["name"];
    var springUrls = projectInfo["spring-urls"];
    if(project && springUrls) {
      var properties = {}
      util.flatten(springUrls.properties || [])
        .map(relativePath)
        .map(util.readProperties)
        .forEach(function (props) {
          util.copyMap(props, properties)
        })
      util.flatten(springUrls.xml || [])
        .map(relativePath)
        .forEach(function (xmlPath) {
          var originalFileContent = spring.createUrlPropertiesForJax(xmlPath, properties, fileLookupFn, serverState.scanInfo.errors)
          var parsedProperties = util.parseProperties(originalFileContent)
          util.addUrlProperties(serverState.urlProperties, project, parsedProperties, originalFileContent)
        })
    }
    if(projectInfo["projects"]) {
      processProjectInfoList(projectInfo["projects"], serverState, fileLookupFn, root)
    }
  })
}

spring.createUrlPropertiesForJax = function(springXmlPath, properties, fileLookupFn, errors) {
 var xml = parseXmlFile(springXmlPath)
  if(xml) {
    function parseXmlClientDef(client) {
      var attrs = client["$"];
      if(attrs) {
        var baseUrl = attrs["address"]
        var serviceClass = attrs["serviceClass"]
        var urlDefinitions = {}
        return resolveJavaAnnotations(serviceClass, baseUrl, properties, fileLookupFn, urlDefinitions, errors)
      } else {
        return []
      }
    }
    return util.flatten([collectTagsRecursively("jaxrs-client:client", xml).map(parseXmlClientDef),
    collectTagsRecursively("jaxws:client", xml).map(parseXmlClientDef)]).join("\n")
  }
}

function resolveKey(value) {
  if(value.indexOf("${") == 0) {
    value = value.slice(value.indexOf("}") + 1, value.length)
  }
  if(value.indexOf("{{") == 0) {
    value = value.slice(value.indexOf("}}") + 2, value.length)
  }
  if(value.indexOf("https://{{") == 0) {
    value = value.slice(value.indexOf("}}")+2, value.length)
  }
  if(value[0] == "/") {
    value = value.slice(1, value.length)
  }
  return value.replace(/\//g,".")
}

function resolveJavaAnnotations(serviceClass, baseUrl, properties, fileLookupFn, urlDefinitions, errors) {
  var classNameArr = serviceClass.split(".");
  var className = classNameArr.pop()
  var package = classNameArr.join(".")
  var classFiles = fileLookupFn(className + ".java")
  if (!classFiles || classFiles.length == 0) {
    var error = "Could not find matching file for " + serviceClass + " Creating a key for the baseUrl " + baseUrl;
    errors.push(error)
    var fullPath = resolvePropertyReferences(baseUrl, properties)
    var key=resolveKey(fullPath)
    return ["# " + error, key + "=" + fullPath]
  }
  var found = []
  var str = []
  classFiles.forEach(function (classFilePath) {
    var fileStr = util.read(classFilePath)
    if (fileStr.indexOf(package) > -1) {
      if (found.length != 0) {
        throw "Already found " + found.join(", ") + " for " + serviceClass + " Has configuration also in " + classFilePath
      }
      found.push(classFilePath)
      str = str.concat(convertAnnotationsToUrlProperties(serviceClass, classFilePath, baseUrl, fileStr, properties, urlDefinitions))
    }
  })
  if (found.length == 0) {
    throw "Could not find definition for " + serviceClass + " from " + classFiles.join(", ")
  }
  return str
}

function convertAnnotationsToUrlProperties(serviceClass, classFilePath, baseUrl, fileStr, properties, urlDefinitions) {
  var str = []
  str.push("# " + serviceClass +" (from: " + classFilePath+")")
  var indexOfFirstOpenCurly = fileStr.indexOf("{")
  var header = fileStr.slice(0, indexOfFirstOpenCurly)
  var body = fileStr.slice(indexOfFirstOpenCurly, fileStr.length)
  var headerPaths = collectPaths(header)
  var bodyPaths = collectPaths(body)
  if (headerPaths.length > 1) {
    throw classFilePath +" has more than one path in header part: " + headerPaths
  }
  var pathPrefix = headerPaths[0] || ""
  bodyPaths.forEach(function(pathString){
    var unresolvedPath = path.join(baseUrl, pathPrefix, pathString);
    var fullPath = resolvePropertyReferences(unresolvedPath, properties)
    var key=resolveKey(fullPath)
    if(urlDefinitions[key]) {
      if (urlDefinitions[key] != fullPath) {
        throw "Key " + key + " has been defined to be " + urlDefinitions[key] + " but " + classFilePath + " contains path " + fullPath
      }
    } else {
      urlDefinitions[key] = fullPath
      str.push(key + "=" + fullPath)
    }
  })
  return str
}

function collectPaths(str) {
  var ret = []
  var re = /@Path\("([^"]*)"\)/g;
  var m;
  while (m = re.exec(str)) {
    ret.push(m[1]);
  }
  return ret;
}

function parseXmlFile(xmlPath) {
  var ret, retErr;
  new xml2js.Parser({
    normalizeTags: true,
    explicitChildren: true,
    preserveChildrenOrder: true,
    explicitRoot: false
  }).parseString(util.read(xmlPath), function (err, result) {
    retErr = err;
    ret = result;
  });
  if(retErr) {
    throw retErr
  }
  return ret;
}

// depth first recursive search
function collectTagsRecursively(tagName, o) {
  var list = []
  if(o["#name"] == tagName) {
    list.push(o)
  }
  if(o["$$"]) {
    o["$$"].forEach(function (i) {
      list = list.concat(collectTagsRecursively(tagName, i))
    })
  }
  return list
}

function resolvePropertyReferences(value, properties) {
  var keyStart
  while((keyStart=value.indexOf("${"))!=-1) {
    var keyEnd = value.indexOf("}", keyStart+2);
    if(keyEnd == -1) {
      throw "Value contains open key reference: " + value
    }
    var keyAndDefault = value.slice(keyStart + 2, keyEnd)
    var args = keyAndDefault.split(":")
    var key=args[0]
    var subValue = undefined
    if(args.length == 2) {
      subValue = properties[key] || args[1]
    } else {
      if(!properties[key]) {
        throw "Missing property '" + key+ "'!"
      }
      subValue = properties[key]
    }
    var strStart = value.slice(0, Math.max(0, keyStart))
    var strEnd = value.slice(Math.min(value.length, keyEnd+1), value.length)
    value = strStart + subValue + strEnd
  }
  return value
}
