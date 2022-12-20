start='/alis/data'
today=$(date '+%Y/%m/%d')
yesterday=$(date -d '1 day ago' '+%Y/%m/%d')

find "$start/$today" "$start/$yesterday" -name *.cube.fits 2>/dev/null \
| cut -d'/' -f-5 | uniq | while read day
do
  find "$day" -name *.cube.fits | jq -Rs 'split("\n")[:-1]' > "$day/cube.json";
done