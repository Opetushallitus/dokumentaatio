#!/usr/bin/env ruby
# encoding: UTF-8

require 'JSON'

@uses = {}
@used_by = {}
@items = []

def add(j)
  if j["uses"] && j["name"]
    name = j["name"]  
    @uses[name] = arr = j["uses"].split(" ")
    @items << name
    arr.each { |u|
      @items << u
      (@used_by[u] ||= []) << name
    }
  end
end

Dir.glob("**/project_info*.json").map { |f|
  j = JSON.load(IO.read(f));
  add(j)
  (j["projects"] || []).each {|p| add(p)}
}

lines = []

uniqueItems = @items.uniq
idMap = {}

puts "------------------------------------- nodes:"

uniqueItems.each_with_index {|s, id|
  idMap[s]=id
  puts "{id: #{id}, label: '#{s}'},"
}

puts "------------------------------------- edges:"

uniqueItems.each {|s|
  [@uses].each { |list|
    if list[s]
      list[s].each { |i|
        puts "{from: #{idMap[s]}, to: #{idMap[i]}},"  
      }
    end
  }
}

puts "------------------------------------- uses:"

puts "var uses=#{JSON.generate(@uses)};"
puts "var usedBy=#{JSON.generate(@used_by)};"