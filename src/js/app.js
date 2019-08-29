//Reference: https://docs.mapbox.com/help/tutorials/mapbox-gl-js-expressions/

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
