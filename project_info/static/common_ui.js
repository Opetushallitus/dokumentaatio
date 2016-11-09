function ajaxJson(method, url, onload) {
  var oReq = new XMLHttpRequest();
  oReq.onload = function (e) {
    onload(e.target.response)
  };
  oReq.open(method, url, true);
  oReq.responseType = 'json';
  oReq.send();
}

function getHash() {
  return (window.location.href || "").split('#')[1] || "";
}

function handleHash() {
  var h = getHash()
  document.getElementById("q").value=h
  filter(h)
}

function addNode(dest, elementType, args) {
  var node = document.createElement(elementType);
  if(args) {
    if(typeof args === 'object') {
      if(args.text) {
        node.appendChild(document.createTextNode(args.text))
        delete args.text
      }
      util.mapEachPair(args, function (key, value) {
        node.setAttribute(key, value)
      })
    } else {
      node.appendChild(document.createTextNode(args))
    }
  }
  dest.appendChild(node)
  return node;
}

function removeChildren(table) {
  while (table.firstChild) {
    table.removeChild(table.firstChild);
  }
}
function redrawFilteredInfoTable(rows, table, headers, drawRow, showRow) {
  removeChildren(table);
  var visibleRows = rows;
  if(showRow) {
    visibleRows = rows.filter(function(row){
      return showRow(row, filter.included, filter.excluded)
    })
  }
  var thead = addNode(table, "thead")
  var headerRow = addNode(thead, "tr")
  headers.forEach(function(f){addNode(headerRow, "th", f)})
  var tbody = addNode(table, "tbody")
  visibleRows.forEach(function(row){
    var infoRow = addNode(tbody, "tr")
    drawRow(row, infoRow)
  })
  document.getElementById("filterInfo").textContent = "Rows:" + visibleRows.length + "/" + data.rows.length
}

var filter = function(value) {
  window.location.hash=value
  filter.included = [], filter.excluded = [], filter.value=value
  value.split(" ").forEach(function(s){
    if(s.length>0) {
      if(s.startsWith("-")) {
        filter.excluded.push(s.substring(1,s.length + 1))
      } else {
        filter.included.push(s);
      }
    }
  })
  if(data) {
    redraw()
  }
}
filter.included = [], filter.excluded = [], filter.value = ""

function linkProject(name) {
  return '<a href="#' + name + '">' + name + '</a>'
}

function convertProjectNamesToLinks(arr, excludes) {
  excludes = excludes || []
  return arr.map(function (name) {
    if(excludes.indexOf(name) !== -1) {
      return name
    } else {
      return linkProject(name)
    }
  })
}

function makeService2ServiceText(listOfTitleArrs, e2eArr, info) {
  var summary = data.summary;
  var e2eUrlMap = summary.service2service[e2eArr.join(".")]
  if (e2eUrlMap) {
    var urlCount = Object.keys(e2eUrlMap).length;
    var e2eUrlsTxt = util.mapEachPair(e2eUrlMap, function (key, value) {
      return '<a class="blueUpArrowLink" href="/url_dependencies.html#'+util.parsePlainUrl(value)+'"></a>' + key + "=" + value
    }).join("<br>")
    var excludeFromProjectLinks = []
    if (info) {
      info.count += urlCount
      excludeFromProjectLinks = info.excludeFromProjectLinks || []
    }
    var txt = listOfTitleArrs.map(function (titleArr) {
      return "<b>" + convertProjectNamesToLinks(titleArr, excludeFromProjectLinks).join(" -> ") + "</b>"
    }).join("<br>") + " [" + urlCount + "]";

    if(!info || info.showUrls) {
      txt += ':<br><pre class="leftMargin2 noMargins">' + e2eUrlsTxt + "</pre>"
    } else {
      txt +="<br>"
    }

    return txt;
  } else {
    return ""
  }
}

function makeNodeTxt(from, projectInfo, summary, options) {
  var options = util.copyMap(options || {}, {
    showUrls: true,
    excludeFromProjectLinks: [from]
  })
  var title = "<h3>" + from + "</h3>"
  var usesTxt = "", usedByTxt = "", includesTxt = "", summaryUseTxt = []

  if (projectInfo && projectInfo.type) {
    summaryUseTxt.push("Type: " + projectInfo.type)
  }

  var usesData = util.safeGet(summary.uses, from, [])
  if (usesData.length > 0) {
    var info = util.copyMap({count: 0}, options)
    usesTxt = usesData.map(function (to) {
        return makeService2ServiceText([[from, to]], [from, to], info)
      }).join("")  + "<br>"
    summaryUseTxt.push("Uses: " + usesData.length + " services with " + info.count + " urls")
  }

  // resolved includes: {project: {library: [[project, library], [project, dep, library]]}]}
  var includes = util.safeGet(summary.resolved_includes, from, {})
  if (!util.isEmptyObject(includes)) {
    var info = util.copyMap({count: 0}, options)
    includesTxt = util.mapEachPair(includes, function (libraryName, includePaths) {
        // iterate through library's direct uses
        var libraryUses = summary.uses[libraryName] || []
        return libraryUses.map(function (libraryUse) {
          // each includePath is appended with libraryUse to get correct headers
          var fullToPaths = includePaths.map(function (includePath) {
            return includePath.concat([libraryUse])
          })
          // generate link information for library and its used service
          return makeService2ServiceText(fullToPaths, [libraryName, libraryUse], info)
        })
      }).join("") + "<br>"
    summaryUseTxt.push("Includes " + Object.keys(includes).length + " libraries with " + info.count + " urls")
  }

  var includedBy = util.safeGet(summary.included_by, from, []);
  if (includedBy.length > 0) {
    summaryUseTxt.push("Included by " + includedBy.length + " services: " + includedBy.map(linkProject).join(", "))
  }

  // exclude current node loopback from "usedby" list because it's rendered already in the "uses" list
  var usedbyData = util.safeGet(data, "summary.used_by." + from, []).filter(function(destLabel){return from != destLabel})
  if (usedbyData.length > 0) {
    var info = util.copyMap({count: 0}, options)
    usedByTxt = usedbyData.map(function (destLabel) {
        return makeService2ServiceText([[destLabel, from]], [destLabel, from], info)
      }).join("")
    summaryUseTxt.push("Used by: " + usedbyData.length + " services with " + info.count + " urls")
  }

  if (!projectInfo) {
    title += "Does not have its own definition!<br>"
  }

  var sources = util.safeCollect(util.safeGet(projectInfo, "sources", []), "path")
  if (sources && sources.length > 0) {
    summaryUseTxt.push("Sources: " + sources.join(", "))
  }

  if (summaryUseTxt.length > 0) {
    title += summaryUseTxt.join("<br>") + "<br><br>"
  }

  title += usesTxt
  title += includesTxt
  title += usedByTxt

  return title;
}
