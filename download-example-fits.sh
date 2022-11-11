mkdir -p public/files/2022/03/30/22
mkdir -p public/files/2022/03/30/23
mkdir -p public/files/2022/03/31/00
mkdir -p public/files/2022/03/31/01
mkdir -p public/files/2022/03/31/02
while read filename; do
  wget -q "http://dalek.umea.irf.se/peje/shrink-fits/2022/03/$filename" -O public/files/2022/03/$filename
done < example-fits-files.txt