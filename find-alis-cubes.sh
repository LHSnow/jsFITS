path='/alis/data'
radix=${1:-today}
day=$(date -d "$radix" '+%Y/%m/%d')
day_before=$(date -d "$radix -1 day" '+%Y/%m/%d')

find "$path/$day" "$path/$day_before" -name *.cube.fits 2>/dev/null \
| cut -d'/' -f1-6 | uniq | while read d
do
  find "$d" -name *.cube.fits | jq -Rs 'split("\n")[:-1]' > "$d/cube.json";
done