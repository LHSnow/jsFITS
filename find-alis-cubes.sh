path='/alis/data'
radix=${1:-today}
day=$(date -d "$radix" '+%Y/%m/%d')
day_before=$(date -d "$radix -1 day" '+%Y/%m/%d')

find "$path/$day" "$path/$day_before" -name *.cube.fits 2>/dev/null \
| cut -d'/' -f-5 | uniq | while read day
do
  find "$day" -name *.cube.fits | jq -Rs 'split("\n")[:-1]' > "$day/cube.json";
done