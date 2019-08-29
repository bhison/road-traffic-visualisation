import "../css/main.css";
import * as sampleData from '../data/data.json';

mapboxgl.accessToken = 'pk.eyJ1IjoiYmhpc29uIiwiYSI6ImNqcDc5a2xlaTEwNmwza28zMDFvYWl1YnkifQ.9KB2DoGG7y7QBd93uBbWFw';

var map = window.map = new mapboxgl.Map({
  container: 'map',
  zoom: 12,
  center: [-3.5485669, 50.724423],
  style: 'mapbox://styles/bhison/cjzx4fu180ehk1crs3kl0eis1'
});

map.on('load', function () {
  GenerateDataSource(processedData => {
    // map.addSource('traffic-data', {
    //   'type': 'geojson',
    //   'data': processedData
    // });

    // map.addLayer({
    //   "id": "points",
    //   "type": "symbol",
    //   "source": 'traffic-data',
    //   "layout": {
    //     "icon-image": "{icon}-15",
    //     "text-field": "{title}",
    //     "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
    //     "text-offset": [0, 0.6],
    //     "text-anchor": "top"
    //   }
    // });
    console.log(processedData);
  });


});

//Convert data to GeoJSON
function GenerateDataSource(callback) {
  let processedData = {
    "type": "FeatureCollection",
    "features": []
  };
  sampleData.data.forEach(element => {
    var existingObjectsWithCountPointId = processedData.features.filter(i =>
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
          "counts": {
            "pushbikes": Number(element.pedal_cycles),
            "motorbikes": Number(element.two_wheeled_motor_vehicles),
            "cars": Number(element.cars_and_taxis),
            "buses": Number(element.buses_and_coaches),
            "lgvs": Number(element.lgvs),
            "hgvs": Number(element.all_hgvs),
            "allMotorVehicles": Number(element.all_motor_vehicles)
          }
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
      //add the values from the alternative direction to the totals
      const match = existingObjectsWithCountPointId[0];
      match.properties.counts.pushbikes += Number(element.pedal_cycles);
      match.properties.counts.motorbikes += Number(element.two_wheeled_motor_vehicles);
      match.properties.counts.cars += Number(element.cars_and_taxis);
      match.properties.counts.buses += Number(element.buses_and_coaches);
      match.properties.counts.lgvs += Number(element.lgvs);
      match.properties.counts.hgvs += Number(element.all_hgvs);
      match.properties.counts.allMotorVehicles += Number(element.all_motor_vehicles);
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
