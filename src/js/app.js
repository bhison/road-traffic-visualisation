//References: 
// https://docs.mapbox.com/help/tutorials/mapbox-gl-js-expressions/
// https://docs.mapbox.com/mapbox-gl-js/example/popup-on-hover/

import "../css/main.css";
import * as sampleData from '../data/data.json';

mapboxgl.accessToken = 'pk.eyJ1IjoiYmhpc29uIiwiYSI6ImNqcDc5a2xlaTEwNmwza28zMDFvYWl1YnkifQ.9KB2DoGG7y7QBd93uBbWFw';

var map = window.map = new mapboxgl.Map({
  container: 'map',
  zoom: 8,
  center: [-3.819440, 50.724423],
  style: 'mapbox://styles/bhison/cjzx4fu180ehk1crs3kl0eis1'
});

map.on('load', function () {
  GenerateDataSource(processedData => {
    map.addSource('traffic-data', {
      'type': 'geojson',
      'data': processedData
    });

    let maxTraffic = processedData.features[0].properties.allMotorVehicles;
    processedData.features.forEach(e => {
      if (e.properties.allMotorVehicles > maxTraffic) {
        maxTraffic = e.properties.allMotorVehicles;
      }
    });
    console.log("Max Traffic:" + maxTraffic);

    map.addLayer({
      "id": "points",
      "type": "circle",
      "source": 'traffic-data',
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          10, [
            '+', 5, [
              '/',
              ['number', ['get', 'allMotorVehicles'], 1],
              8000 //scaled until it looks kind of right
            ]
          ],
          13, [
            '+', 5, [
              '/',
              ['number', ['get', 'allMotorVehicles'], 1],
              5000 //scaled until it looks kind of right
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

// Change the cursor to a pointer when the mouse is over the places layer.
map.on('mouseenter', 'points', function (e) {
  map.getCanvas().style.cursor = 'pointer';

  let coordinates = e.features[0].geometry.coordinates.slice();
  let properties = e.features[0].properties;
  let description = 
    "<p><b>Count:</b> "+ properties.allMotorVehicles +
    "<br><em>" + properties.roadName + " from " +
     properties.startJunction + " to " + properties.endJunction + "</em>";

  // Ensure that if the map is zoomed out such that multiple
  // copies of the feature are visible, the popup appears
  // over the copy being pointed to.
  while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
  }

  popup.setLngLat(coordinates)
    .setHTML(description)
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

// function DrawPoints() {
//   //Only draw filtered data

// }



/*
Unimplemented ideas
--ability to break down information by direction - add extra fields to geojson feature properties
*/
