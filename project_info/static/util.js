function exportUtil(module, window) {
  var util = {}
  if (module) {
    module.exports = util
  }
  if (window) {
    window.util = util
  }

  util.arrToLowerCase = function (array) {
    return array.map(function (txt) {
      return txt.toLowerCase();
    })
  }

  util.someMatches = function (arr, subs, caseSensitive) {
    if (!caseSensitive) {
      arr = util.arrToLowerCase(arr)
      subs = util.arrToLowerCase(subs)
    }
    return arr.some && arr.some(function (str) {
        return subs.some(function (substring) {
          return str.indexOf(substring) > -1
        })
      })
  }

  util.uniq = function (arr) {
    return arr.reverse().filter(function (e, i, arr) {
      return arr.indexOf(e, i + 1) === -1;
    }).reverse();
  }

  util.groupBy = function (list, fn, multi) {
    if(multi === undefined) {
      multi = true
    }
    var ret = {}
    list.forEach(function (i) {
      var key = fn(i)
      if(multi) {
        if (!ret[key]) {
          ret[key] = []
        }
        ret[key].push(i)
      } else {
        ret[key]=i
      }
    })
    return ret
  }

// depth first recursive flatten
  util.flatten = function (item, dest) {
    if (dest === undefined) {
      dest = []
    }
    if (Array.isArray(item)) {
      item.forEach(function (i) {
        util.flatten(i, dest)
      })
    } else {
      dest.push(item)
    }
    return dest
  }

  // copies values from object to target. if multi is set values are stored to a list
  util.copyMap = function (from, target, multi) {
    Object.keys(from).forEach(function (key) {
      if(multi) {
        util.addUniqueToMultiMap(target, key, from[key]);
      } else {
        target[key] = from[key];
      }
    })
    return target
  }

// flattens nested map by concatenating keys with commas
// {test: {map: {key: value}}} -> {"test.map.key": value}
// note: supports only strings or maps as values
  util.flattenNested = function (obj, multi) {
    var ret = {}
    function add(key, value) {
      if(ret[key]) {
        if(!Array.isArray(ret[key])) {
          ret = [ret[key]]
        }
        ret[key].push(value)
      } else {
        if(multi || Array.isArray(value)) {
          ret[key]=[value]
        } else {
          ret[key]=value
        }
      }
    }
    function addAll(key, values) {
      if(Array.isArray(values)) {
        values.forEach(function (value) {
          add(key, value)
        })
      } else {
        add(key, values)
      }
    }
    if (Array.isArray(obj)) {
      obj.forEach(function (i){
        var tmp = util.flattenNested(i, multi);
        Object.keys(tmp).forEach(function (key) {
          addAll(key, tmp[key])
        })
      })
    } else if (typeof obj === 'object') {
      Object.keys(obj).forEach(function (key) {
        var val = obj[key];
        if(Array.isArray(obj) || typeof val === 'object') {
          var tmp = util.flattenNested(val, multi)
          Object.keys(tmp).forEach(function(tmpKey){
            addAll(key + "." + tmpKey, tmp[tmpKey])
          })
        } else {
          add(key, val)
        }
      })
    }
    return ret
  }

  util.safeGet = function (o, path, defaultValue) {
    if (!o) {
      return defaultValue
    }
    if (o.hasOwnProperty(path)) {
      return o[path]
    } else {
      var arr = path.split(".")
      if (arr.length == 1) {
        return defaultValue
      }
      var firstArg = arr.shift()
      if (o.hasOwnProperty(firstArg)) {
        return util.safeGet(o[firstArg], arr.join("."), defaultValue)
      } else {
        return defaultValue
      }
    }
  }

  function replaceAll(source, from, to) {
    return source.split(from).join(to);
  }

  // collect values based on named path
  //   util.safeCollect([{href: 1}, {href: 2}], "href") -> [1,2]
  // supports regex. "*" matches any key, "**" matches any path, "." is escaped
  util.safeCollect = function (obj, prefix) {
    var matchAll = ";;;;;;";
    var flattened = util.flattenNested(obj, true);
    var prefixStartsWithStarStarDot = prefix.startsWith("**.")
    var str = replaceAll(prefix, '.', "\\.")
    str = replaceAll(str, '**', matchAll)
    str = replaceAll(str, '*', "[^.]*")
    str = "^" + replaceAll(str, matchAll, ".*")
    var regexp = new RegExp(str)
    var matchingKeys = Object.keys(flattened).filter(function (key) {
      return key.match(regexp) || prefixStartsWithStarStarDot && ("."+key).match(regexp)
    })
    var ret = []
    matchingKeys.forEach(function (key) {
      ret = ret.concat(flattened[key])
    })
    return ret
  }

  util.parseServiceName = function (key) {
    if (key.indexOf(".") > 0) {
      return key.substring(0, key.indexOf("."));
    }
  }

  util.values = function (map) {
    return Object.keys(map).map(function (key) {
      return map[key]
    })
  }

  util.listToMap = function (list, key) {
    var map = {}
    list.forEach(function (o) {
      map[o[key]] = o
    })
  }

  util.addUniqueToMultiMap = function (dest, key, value) {
    if (!dest[key]) {
      dest[key] = []
    }
    if (dest[key].indexOf(value) == -1) {
      dest[key].push(value)
    }
  }

  util.mapEachPair = function (obj, fn) {
    return Object.keys(obj).map(function (key) {
      return fn(key, obj[key])
    })
  }

  // create the value for key only once and return generated value for following calls
  util.singletonValue = function (lookupMap, key, o) {
    if (!(key in lookupMap)) {
      if (typeof o === "function") {
        lookupMap[key] = o()
      } else {
        lookupMap[key] = o
      }
    }
    return lookupMap[key]
  }

  // combines source information to named project infos.
  // recursively goes through project_info.projects and flattens them to the same list
  util.combineSourcesToProjectInfoMap = function (sources) {
    var map = {}
    var appendFromSourceToProjectInfoMap = function (source, parent) {
      var name = source["name"]
      var originalProjectInfo = {}
      if (parent.sources) {
        // subProject is defined by the same sources as its parent, so copy the value here
        originalProjectInfo.sources = parent.sources
      }
      var dest = util.singletonValue(map, name, originalProjectInfo)
      Object.keys(source).forEach(function (key) {
        var value = source[key];
        // key already defined, merge or ..?
        if (Array.isArray(dest[key]) || ["sources", "uses", "includes", "projects", "spring", "url-config"].indexOf(key) > -1) {
          // arrays can be merged
          dest[key] = util.flatten(dest[key] || []).concat(util.flatten(value))
        } else if (["properties"].indexOf(key) > -1) {
          if (!dest[key]) {
            dest[key] = {}
          }
          util.copyMap(value, dest[key] || {})
        } else if (!dest[key]) {
          dest[key] = value;
        } else if (["name", "type"].indexOf(key) > -1 && dest[key] === value) {
          // skip already defined existing values
        } else {
          throw "Unsupported key " + key + "for project " + name + " with value: " + JSON.stringify(value) + " from: " + JSON.stringify(source.paths)
        }
        // if there is a 'projects' key defined, it needs to be parsed recursively
        if (key == "projects") {
          util.flatten(value).forEach(function (subProject) {
            appendFromSourceToProjectInfoMap(subProject, source)
          })
        }
      })
    };
    sources.forEach(appendFromSourceToProjectInfoMap)
    return map
  }

// collects "uses", "service2service", "resolved_includes", "included_by" information from project info "properties"
// "service2service" groups properties by {"thisProject.destProject": ["key=value"]}
  function collectSummaryFromProjectInfoMap(projectInfoMap, summary) {
    function addUsedBy(user, target) {
      util.addUniqueToMultiMap(summary.used_by, target, user)
    }

    Object.keys(projectInfoMap).forEach(function (project) {
      var s2sInfo = {}
      var projectInfo = projectInfoMap[project];
      var properties = projectInfo.properties || {}
      Object.keys(properties).forEach(function (key) {
        var destService = util.parseServiceName(key);
        // ignore keys without .
        if (destService) {
          var s2sKey = project + "." + destService;
          s2sInfo[s2sKey] = (s2sInfo[s2sKey] || {})
          s2sInfo[s2sKey][key] = properties[key]
          util.addUniqueToMultiMap(summary.uses, project, destService)
          addUsedBy(project, destService)
        }
      })
      util.copyMap(s2sInfo, summary.service2service)
      var includesMap = resolveIncludesToMap(projectInfoMap, projectInfo);
      if (!util.isEmptyObject(includesMap)) {
        summary.resolved_includes[project] = includesMap
        Object.keys(includesMap).forEach(function (resolvedIncludeName) {
          util.addUniqueToMultiMap(summary.included_by, resolvedIncludeName, project)
        })
      }
    })
  }

  // return list of all includes which include urls. recursive
  function resolveIncludes(projectInfoMap, projectInfo) {
    var list = []
    var includes = projectInfo.includes || []
    includes.forEach(function (includedProjectName) {
      var nextProjectInfo = projectInfoMap[includedProjectName];
      if (nextProjectInfo.properties && !util.isEmptyObject(nextProjectInfo.properties)) {
        list.push([includedProjectName])
      }
      resolveIncludes(projectInfoMap, nextProjectInfo).forEach(function (resolvedInclude) {
        list.push([includedProjectName].concat(resolvedInclude))
      })
    })
    return list
  }

  function resolveIncludesToMap(projectInfoMap, projectInfo) {
    var list = resolveIncludes(projectInfoMap, projectInfo);
    list.map(function (l) {
      l.unshift(projectInfo.name)
    })
    var groupBy = util.groupBy(list, function (includeList) {
      return includeList[includeList.length - 1]
    });
    return groupBy
  }

// list of all urls and their uses: {project: "xx", url: "/rest/url", count: 20, uses: [{project: "", key: "", original_url: ""}]}
// TODO: does not support include, instead lists direct dependencies
  util.collectUrlUse = function (projectInfoMap) {
    var urlUseLookup = {}

    function addUrl(destService, plainUrl, userProject, userKey, originalUrl) {
      var lookupKey = destService + "." + plainUrl
      var info = util.singletonValue(urlUseLookup, lookupKey, {
        project: destService,
        url: plainUrl,
        count: 0,
        uses: []
      })
      info.count = info.count + 1
      info.uses.push({project: userProject, key: userKey, original_url: originalUrl})
    }

    util.values(projectInfoMap).forEach(function (projectInfo) {
      var properties = projectInfo.properties || []
      Object.keys(properties).forEach(function (userKey) {
        var destService = util.parseServiceName(userKey)
        if (destService) {
          var originalUrl = properties[userKey]
          addUrl(destService, util.parsePlainUrl(originalUrl), projectInfo.name, userKey, originalUrl)
        }
      })
    })
    return util.values(urlUseLookup)
  }

// walks through the projectInfoMap and collects information
  util.collectProjectInfoSummary = function (projectInfoMap) {
    var summary = {
      // use information, by project.name
      uses: {}, used_by: {},
      // resolved includes: {project: {library: [[project, library], [project, dep, library]]}]}
      resolved_includes: {}, included_by: {},
      // list of project.names
      items: [],
      // maps for project.name's id in items
      id_name_map: {}, name_id_map: {},
      // lists each myProject.destProject dep and  {"thisProject.destProject": {key: value}, ...}
      service2service: {}
    };

    collectSummaryFromProjectInfoMap(projectInfoMap, summary)
    var allMapsThatDefineProjectNames = [projectInfoMap, summary.uses, summary.used_by, summary.resolved_includes, summary.included_by];
    summary.items = util.uniq(util.flatten(allMapsThatDefineProjectNames.map(Object.keys))).sort()
    summary.items.forEach(function (name, index) {
      summary.id_name_map[index] = name
      summary.name_id_map[name] = index
    })
    return summary
  }

  util.generateGraphInfo = function (projectInfoMap, summary, showLibrariesAsNodes) {
    var edgeLookup = {}

    function projectInfoIsVisible(name) {
      return showLibrariesAsNodes || "library" != util.safeGet(projectInfoMap, name + ".type")
    }

    function generateNodeList(projectInfoMap, summary, visibleItems) {
      return visibleItems.map(function (name) {
        var nodeInfo = {
          name: name,
          id: summary.name_id_map[name],
          hasSources: util.safeGet(projectInfoMap, name + ".sources", []).length > 0,
        };
        if (util.safeGet(projectInfoMap, name + ".type")) {
          nodeInfo.type = util.safeGet(projectInfoMap, name + ".type")
        }
        return nodeInfo
      })
    }

    function makeEdgeData(from, to, fromInclude) {
      var edgeKey = from + "." + to
      var edgeData = util.singletonValue(edgeLookup, edgeKey, {
        from: summary.name_id_map[from],
        to: summary.name_id_map[to]
      })
      if (from != to && summary.service2service[from + "." + to] && summary.service2service[to + "." + from]) {
        edgeData.twoway = true
      }
      if (fromInclude) {
        edgeData.include = true
      }
      return edgeData
    }

    function generateEdgeList(projectInfoMap, summary, visibleItems) {
      return util.flatten(visibleItems.map(function (from) {
        var edges = util.safeGet(summary.uses, from, []).filter(projectInfoIsVisible).map(function (to) {
          return makeEdgeData(from, to);
        })
        if (showLibrariesAsNodes) {
          var projectInfoDirectIncludeEdges = util.safeGet(projectInfoMap, from + ".includes", []).filter(projectInfoIsVisible).map(function (to) {
            return makeEdgeData(from, to, true);
          })
          edges = edges.concat(projectInfoDirectIncludeEdges)
        } else {
          // skip libraries
          var resolvedIncludesEdges = Object.keys(util.safeGet(summary.resolved_includes, from, [])).filter(projectInfoIsVisible).map(function (to) {
            return makeEdgeData(from, to, true);
          })
          edges = edges.concat(resolvedIncludesEdges)
        }
        return edges
      }))
    }

    var visibleItems = summary.items.filter(projectInfoIsVisible);
    return {
      nodes: generateNodeList(projectInfoMap, summary, visibleItems),
      edges: generateEdgeList(projectInfoMap, summary, visibleItems)
    }
  }
// generates map for showing the project info table
// {fields: ["name","makeFile"], project_infos:[{name: "Test", makeFile: "Yes"}]}
  util.generateProjectInfoTable = function (projectInfos) {
    var fields = [];
    projectInfos.forEach(function (i) {
      fields = fields.concat(Object.keys(i))
    })
    return {
      project_infos: projectInfos,
      fields: util.uniq(fields)
    }
  }

  // create a simplified version of the url without prefixing value resolution or url protocols
  util.parsePlainUrl = function (value) {
    if (value.indexOf("https://{{") == 0) {
      value = value.slice(value.indexOf("}}") + 2, value.length)
    }
    if (value.indexOf("https://${") == 0) {
      value = value.slice(value.indexOf("}") + 2, value.length)
    }
    if (value.indexOf("${") == 0) {
      value = value.slice(value.indexOf("}") + 1, value.length)
    }
    if (value.indexOf("{{") == 0) {
      value = value.slice(value.indexOf("}}") + 2, value.length)
    }
    return value;
  }

  // resolve key for relative url
  util.resolveKeyForRelativeUrl = function(value) {
    value = util.parsePlainUrl(value);
    if(value[0] == "/") {
      value = value.slice(1, value.length)
    }
    return value.replace(/\//g,".")
  }

  util.resolvePropertyReferences = function (value, properties) {
    var keyStart
    while ((keyStart = value.indexOf("${")) != -1) {
      var keyEnd = value.indexOf("}", keyStart + 2);
      if (keyEnd == -1) {
        throw "Value contains open key reference: " + value
      }
      var keyAndDefault = value.slice(keyStart + 2, keyEnd)
      var args = keyAndDefault.split(":")
      var key = args[0]
      var subValue = undefined
      if (args.length == 2) {
        subValue = properties[key] || args[1]
      } else {
        if (!properties[key]) {
          throw "Missing property '" + key + "'!"
        }
        subValue = properties[key]
      }
      var strStart = value.slice(0, Math.max(0, keyStart))
      var strEnd = value.slice(Math.min(value.length, keyEnd + 1), value.length)
      value = strStart + subValue + strEnd
    }
    return value
  }

  util.isEmptyObject = function (o) {
    return Object.keys(o).length == 0
  }

}
if (typeof window === 'undefined') {
  exportUtil(module)
} else {
  exportUtil(undefined, window)
}