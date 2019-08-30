//References: 
// https://docs.mapbox.com/help/tutorials/mapbox-gl-js-expressions/
// https://docs.mapbox.com/mapbox-gl-js/example/popup-on-hover/

import "../css/main.css";
import * as sampleData from '../data/data.json';

mapboxgl.accessToken = 'pk.eyJ1IjoiYmhpc29uIiwiYSI6ImNqcDc5a2xlaTEwNmwza28zMDFvYWl1YnkifQ.9KB2DoGG7y7QBd93uBbWFw';

let map = window.map = new mapboxgl.Map({
  container: 'map',
  zoom: 8,
  center: [-3.819440, 50.724423],
  style: 'mapbox://styles/bhison/cjzx4fu180ehk1crs3kl0eis1'
});

let unfilteredData, filteredData;

map.on('load', function () {
  GenerateDataSource(processedData => {
    unfilteredData = processedData;
    filteredData = processedData;

    map.addSource('traffic-data', {
      'type': 'geojson',
      'data': filteredData
    });

    //TODO: set circle colour based on distance from max
    let maxTraffic = processedData.features[0].properties.allMotorVehicles;
    processedData.features.forEach(e => {
      if (e.properties.allMotorVehicles > maxTraffic) {
        maxTraffic = e.properties.allMotorVehicles;
      }
    });
    console.log("Max Traffic:" + maxTraffic);
    //

    map.addLayer({
      "id": "points",
      "type": "circle",
      "source": 'traffic-data',
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          6, 1, //make point size 1 when zoomed out a lot
          8, [
            '+', 5, [
              '/',
              ['number', ['get', 'allMotorVehicles'], 1],
              8000 //scale
            ]
          ],
          15, [
            '+', 5, [
              '/',
              ['number', ['get', 'allMotorVehicles'], 1],
              5000 //scale
            ]
          ]
        ],
        'circle-opacity': 0.8,
        'circle-color': 'rgb(171, 72, 33)'
      }
    });
  });
});

var popup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false
});

map.on('mouseenter', 'points', function (e) {
  // filteredData.features.forEach(element => {
  //   if (e.features[0].properties.pointId == element.properties.pointId) {
  //     console.log(element.properties.allMotorVehicles);
  //     element.properties.allMotorVehicles += 10000;
  //   }
  // });
  // map.getSource('traffic-data').setData(filteredData);

  map.getCanvas().style.cursor = 'pointer';

  let coordinates = e.features[0].geometry.coordinates.slice();
  let properties = e.features[0].properties;
  let popupContents =
    "<p><b>Count:</b> " + properties.allMotorVehicles +
    "<br><b>Location: </b><em>" + properties.roadName + " <span class='fromto'>from</span> " +
    properties.startJunction + " <span class='fromto'>to</span> " + properties.endJunction + "</em>";

  // Prevent popup trying to render twice on far zoomout
  while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
  }

  popup.setLngLat(coordinates)
    .setHTML(popupContents)
    .addTo(map);
});

map.on('mouseleave', 'points', function () {
  map.getCanvas().style.cursor = '';
  popup.remove();
});

//Convert data to GeoJSON
function GenerateDataSource(callback) {
  let processedData = {
    "type": "FeatureCollection",
    "features": []
  };
  sampleData.data.forEach(element => {
    let existingObjectsWithCountPointId = processedData.features.filter(i =>
      i.properties.pointId == element.count_point_id
    );
    if (existingObjectsWithCountPointId.length <= 0) {
      processedData.features.push({
        "type": "Feature",
        "properties": {
          "pointId": element.count_point_id,
          "roadType": element.road_type,
          "roadName": element.road_name,
          "startJunction": element.start_junction_road_name,
          "endJunction": element.end_junction_road_name,
          "pushbikes": Number(element.pedal_cycles),
          "motorbikes": Number(element.two_wheeled_motor_vehicles),
          "cars": Number(element.cars_and_taxis),
          "buses": Number(element.buses_and_coaches),
          "lgvs": Number(element.lgvs),
          "hgvs": Number(element.all_hgvs),
          "allMotorVehicles": Number(element.all_motor_vehicles)
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            Number(element.longitude),
            Number(element.latitude)
          ]
        }
      })
    } else {
      //consolidate the counts from the all directions
      const match = existingObjectsWithCountPointId[0];
      match.properties.pushbikes += Number(element.pedal_cycles);
      match.properties.motorbikes += Number(element.two_wheeled_motor_vehicles);
      match.properties.cars += Number(element.cars_and_taxis);
      match.properties.buses += Number(element.buses_and_coaches);
      match.properties.lgvs += Number(element.lgvs);
      match.properties.hgvs += Number(element.all_hgvs);
      match.properties.allMotorVehicles += Number(element.all_motor_vehicles);
    }
  });

  callback(processedData);
}


// +++++ DATA FILTER CONTROLS (from this point to bottom of file) +++++ //
const allMotorCheck = document.getElementById('all-motor');
const motorbikeCheck = document.getElementById('motorbike');
const carsCheck = document.getElementById('cars');
const busesCheck = document.getElementById('buses');
const lgvsCheck = document.getElementById('lgvs');
const hgvsCheck = document.getElementById('hgvs');
const pedalbikesCheck = document.getElementById('pedalbikes');

console.log("Test checkboxes:");
console.log("Pedalbikes value: " + pedalbikesCheck.checked);

allMotorCheck.addEventListener('click', e => {
  motorbikeCheck.checked = allMotorCheck.checked;
  carsCheck.checked = allMotorCheck.checked;
  busesCheck.checked = allMotorCheck.checked;
  lgvsCheck.checked = allMotorCheck.checked;
  hgvsCheck.checked = allMotorCheck.checked;
  FilterDataAndRedraw();
  console.log('biltong');
});
motorbikeCheck.addEventListener('click', e => {
  if(!motorbikeCheck.checked) {
    allMotorCheck.checked = false;
  } SwitchAllMotorsCheckIfAllSelected();
  FilterDataAndRedraw();
});
carsCheck.addEventListener('click', e => {
  if(!carsCheck.checked) {
    allMotorCheck.checked = false;
  } SwitchAllMotorsCheckIfAllSelected();
  FilterDataAndRedraw();
});
busesCheck.addEventListener('click', e => {
  if(!busesCheck.checked) {
    allMotorCheck.checked = false;
  } else SwitchAllMotorsCheckIfAllSelected();
  FilterDataAndRedraw();
});
lgvsCheck.addEventListener('click', e => {
  if(!lgvsCheck.checked) {
    allMotorCheck.checked = false;
  } else SwitchAllMotorsCheckIfAllSelected();
  FilterDataAndRedraw();
});
hgvsCheck.addEventListener('click', e => {
  if(!hgvsCheck.checked) {
    allMotorCheck.checked = false;
  } else SwitchAllMotorsCheckIfAllSelected();
  FilterDataAndRedraw();
});
pedalbikesCheck.addEventListener('click', e => {
  FilterDataAndRedraw();
});

function SwitchAllMotorsCheckIfAllSelected(){
  if(motorbikeCheck.checked &&
    carsCheck.checked &&
    busesCheck.checked &&
    lgvsCheck.checked &&
    hgvsCheck.checked
    )
    allMotorCheck.checked = true;
}

function FilterDataAndRedraw() {

}

/*
Unimplemented ideas
--ability to break down information by direction - add extra fields to geojson feature properties
--d3 graph to show most common type of road to travel down for each vehicle type
*/
