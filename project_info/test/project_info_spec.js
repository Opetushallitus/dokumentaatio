var assert = require('assert');
var convert = require('../lib/convert.js')
var scan = require('../lib/scan.js')

describe('convert.js', function () {
  it('uniq', function () {
    assert.deepEqual(convert.uniq([1, 1, 3]), [1, 3])
  })

  it('generateProjectInfoTable', function () {
    assert.deepEqual(convert.generateProjectInfoTable([{
      "a": 1, "b": 2
    }, {
      "a": 1, "c": 2
    }]), {
      project_infos: [{a: 1, b: 2}, {a: 1, c: 2}],
      fields: ['a', 'b', 'c']
    })
  })

  it('appendUsesAndS2SInfoToUrlProperties', function () {
    assert.deepEqual(convert.appendUsesAndS2SInfoToUrlProperties({
        a: {
          name: "a",
          properties: {
            "b.url": 1
          }
        },
        b: {
          name: "b",
          properties: {
            "a.url": 1
          }
        }
      }), [{
        "name": "a",
        "properties": {
          "b.url": 1
        },
        "service2service": {
          "a.b": [
            "b.url=1"
          ]
        },
        "uses": "b"
      },
        {
          "name": "b",
          "properties": {
            "a.url": 1
          },
          "service2service": {
            "b.a": [
              "a.url=1"
            ]
          },
          "uses": "a"
        }]
    )
  })

  it('createGraphInfoFromProjectInfos', function () {
    var projectInfoList = convert.appendUsesAndS2SInfoToUrlProperties({
      a: {
        name: "a",
        properties: {
          "b.url": "1"
        }
      },
      b: {
        name: "b",
        properties: {
          "a.url": "1"
        }
      }
    });
    console.log(JSON.stringify(convert.createGraphInfoFromProjectInfos(projectInfoList)))
    assert.deepEqual(convert.createGraphInfoFromProjectInfos(projectInfoList), {
      "uses": {"a": ["b"], "b": ["a"]},
      "used_by": {"b": ["a"], "a": ["b"]},
      "items": ["a", "b"],
      "id_name_map": {"0": "a", "1": "b"},
      "name_id_map": {"a": 0, "b": 1},
      "service2service": {"a.b": ["b.url=1"], "b.a": ["a.url=1"]},
      "project_infos": {
        "a": {
          "uses": "b",
          "service2service": {"a.b": ["b.url=1"]},
          "name": "a",
          "properties": {"b.url": "1"}
        }, "b": {
          "uses": "a",
          "service2service": {"b.a": ["a.url=1"]},
          "name": "b",
          "properties": {"a.url": "1"}
        }
      },
      "url_uses": [{
        "project": "b",
        "url": "1",
        "count": 1,
        "uses": [{"project": "a", "key": "b.url", "original_url": "1"}]
      }, {
        "project": "a",
        "url": "1",
        "count": 1,
        "uses": [{"project": "b", "key": "a.url", "original_url": "1"}]}]
    })
  })


})
