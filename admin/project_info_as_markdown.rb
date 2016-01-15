#!/usr/bin/env ruby
# encoding: UTF-8

require 'JSON'

headers = []
includedHeaders = (ARGV[0] || "").split(",")

lines = Dir.glob("**/*project_info.json").map { |f|
  j = JSON.load(IO.read(f));
  l = []
  if !includedHeaders.empty?
    j.delete_if { |k,v|
      !includedHeaders.include?(k)  
    }
  end
  headers.each { |h|
    l.push(j.delete(h) || "")
  }
  j.each_pair { |k,v|
    headers.push(k)
    l.push(v)
  };
  l
}.select{|l| !l.empty?}
puts(lines.unshift(headers.map{"---"}).unshift(headers).map{|l| "|#{l.join("|")}|"}.join("\n"))  