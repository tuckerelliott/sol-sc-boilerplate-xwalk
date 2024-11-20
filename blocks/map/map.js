// var long = document.getElementById("49131").innerHTML
// var lat = document.getElementById("-123091").innerHTML

const directions = document.getElementsByClassName('map')[0].innerHTML;
// var longandlat = directions.match(/(\d+(?:\.\d+)?)/g);
const longandlat = directions.match(/(-?\d+(?:\.\d+)?)/g);

const long = longandlat[0];
const lat = longandlat[1];

// alert (long + "" + lat)
// document.getElementById('google-map-location').innerHTML = long + " " + lat;
const map = document.createElement('p');
map.id = 'google-map-location';
const location = document.getElementsByClassName('map')[0];
location.appendChild(map);

// document.getElementById('google-map-location').innerHTML = "<object type=\"text/html\" data=\"https://google.com/maps?q=" + long + "," + lat + "\"" + "style=\"width:1400px; height:400px\"></object>";
document.getElementById('google-map-location').innerHTML = '<object type="text/html" data="https://www.google.com/maps/embed/v1/place?key=AIzaSyDXzFn5v3nI8tvmgI9lDk17bVYszO0ThsI&zoom=12&maptype=roadmap&q=' + long + "," + lat + '"' + 'style="width:1200px; height:600px"></object>';
