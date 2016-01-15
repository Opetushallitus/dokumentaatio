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

@items.uniq.each {|i|
  if @uses[i]
    lines << ["#{i} uses", @uses[i].join(" ")]
  end
  if @used_by[i]
    lines << ["#{i} is used by", @used_by[i].join(" ")]
  end
}

puts(lines.map{|l| "|#{l.join("|")}|"}.join("\n"))  