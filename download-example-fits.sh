mkdir -p public/files
while read filename; do
  wget -q "http://dalek.umea.irf.se/peje/shrink-fits/2022-03-03/19/$filename" -O public/files/$filename
done < example-fits-files.txt