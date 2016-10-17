function ajaxJson(method, url, onload) {
  var oReq = new XMLHttpRequest();
  oReq.onload = function (e) {
    onload(e.target.response)
  };
  oReq.open(method, url, true);
  oReq.responseType = 'json';
  oReq.send();
}

function handleHash() {
  var h = window.location.href.split('#')[1]
  if (h && h.length > 0) {
    document.getElementById("q").value=h
    filter(h)
  }
}

function arrToLowerCase(array) {
  return array.map(function (txt) {
    return txt.toLowerCase();
  })
}

function someMatches(arr, subs, caseSensitive) {
  if(!caseSensitive) {
    arr = arrToLowerCase(arr)
    subs = arrToLowerCase(subs)
  }
  return arr.some && arr.some(function(str){
      return subs.some(function(substring) {
        return str.indexOf(substring) > -1
      })
    })
}

function addNode(dest, elementType, text) {
  var node = document.createElement(elementType);
  if(text) {
    node.appendChild(document.createTextNode(text))
  }
  dest.appendChild(node)
  return node;
}

function redrawFilteredInfoTable(rows, table, headers, drawRow, showRow) {
  while (table.firstChild) {
    table.removeChild(table.firstChild);
  }
  var visibleRows = rows.filter(function(row){
    return showRow(row, filter.included, filter.excluded)
  })
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
  filter.included = [], filter.excluded = []
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
filter.included = [], filter.excluded = []

function flatten(arr) {
  return arr.reduce(function(a, b) {
    return a.concat(b);
  }, []);
}
