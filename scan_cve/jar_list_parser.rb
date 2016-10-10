filestr = IO.read(ARGV[0])
mydir = File.dirname(__FILE__)
cache = {}
shown={}
filestr.each_line { |l|
  matches = l.scan(/([A-Za-z0-9_\-.]+:[A-Za-z0-9_\-.]+:[A-Za-z0-9_\-.]+)/)
  if(matches.size == 0)
    puts(l)
    shown.clear
  elsif(matches.size == 1)
    id = matches.flatten[0]
    if(!shown.include?(id))
      if(!cache[id])
        resolved =`#{mydir}/victims-version-search/victims-version-search.py --victims-cve-db=#{mydir}/victims-cve-db #{id}`.gsub("0 of 0 jar files was scanned.\n","")
        cache[id]=resolved
      end
      print cache[id]
      shown[id]=true
    else
    end
  else
    raise "Problems? More than one match: #{l}"
  end
}