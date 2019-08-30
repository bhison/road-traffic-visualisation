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
    map.addSource('traffic-data', {
      'type': 'geojson',
      'data': unfilteredData
    });

    FilterDataAndRedraw();

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
              ['number', ['get', 'filterSum'], 1],
              8000 //scale
            ]
          ],
          15, [
            '+', 5, [
              '/',
              ['number', ['get', 'filterSum'], 1],
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
  map.getCanvas().style.cursor = 'pointer';

  let coordinates = e.features[0].geometry.coordinates.slice();
  let properties = e.features[0].properties;
  let popupContents =
    "<p><b>Count:</b> " + properties.filterSum +
    "<br><b>Location: </b><em>" + properties.roadName + 
    " <span class='fromto'>from</span> " + properties.startJunction +
    " <span class='fromto'>to</span> " + properties.endJunction + "</em>";

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
          "allMotorVehicles": Number(element.all_motor_vehicles),
          "filterSum": (Number(element.all_motor_vehicles) + Number(element.pedal_cycles))
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

allMotorCheck.addEventListener('click', e => {
  motorbikeCheck.checked = allMotorCheck.checked;
  carsCheck.checked = allMotorCheck.checked;
  busesCheck.checked = allMotorCheck.checked;
  lgvsCheck.checked = allMotorCheck.checked;
  hgvsCheck.checked = allMotorCheck.checked;
  FilterDataAndRedraw();
});

motorbikeCheck.addEventListener('click', e => {
  if (!motorbikeCheck.checked) {
    allMotorCheck.checked = false;
  } SwitchAllMotorsCheckIfAllSelected();
  FilterDataAndRedraw();
});

carsCheck.addEventListener('click', e => {
  if (!carsCheck.checked) {
    allMotorCheck.checked = false;
  } SwitchAllMotorsCheckIfAllSelected();
  FilterDataAndRedraw();
});

busesCheck.addEventListener('click', e => {
  if (!busesCheck.checked) {
    allMotorCheck.checked = false;
  } else SwitchAllMotorsCheckIfAllSelected();
  FilterDataAndRedraw();
});

lgvsCheck.addEventListener('click', e => {
  if (!lgvsCheck.checked) {
    allMotorCheck.checked = false;
  } else SwitchAllMotorsCheckIfAllSelected();
  FilterDataAndRedraw();
});

hgvsCheck.addEventListener('click', e => {
  if (!hgvsCheck.checked) {
    allMotorCheck.checked = false;
  } else SwitchAllMotorsCheckIfAllSelected();
  FilterDataAndRedraw();
});

pedalbikesCheck.addEventListener('click', e => {
  FilterDataAndRedraw();
});

function SwitchAllMotorsCheckIfAllSelected() {
  if (motorbikeCheck.checked &&
    carsCheck.checked &&
    busesCheck.checked &&
    lgvsCheck.checked &&
    hgvsCheck.checked) {
    allMotorCheck.checked = true;
  }
}

function FilterDataAndRedraw() {
  FilterData(e => {
    map.getSource('traffic-data').setData(filteredData);
  });  
}

function FilterData(callback){
  filteredData = unfilteredData;
  filteredData.features.forEach(element => {
    element.properties.filterSum = 0;
    if(allMotorCheck.checked){
      element.properties.filterSum += element.properties.allMotorVehicles;
    } else {
      if(motorbikeCheck.checked) element.properties.filterSum += element.properties.motorbikes;
      if(carsCheck.checked) element.properties.filterSum += element.properties.cars;
      if(busesCheck.checked) element.properties.filterSum += element.properties.buses;
      if(lgvsCheck.checked) element.properties.filterSum += element.properties.lgvs;
      if(hgvsCheck.checked) element.properties.filterSum += element.properties.hgvs;
    }
    if(pedalbikesCheck.checked) {
      element.properties.filterSum += element.properties.pushbikes;
    }
  });
  console.log(filteredData);
  callback();
}

/*
Unimplemented ideas
--ability to break down information by direction - add extra fields to geojson feature properties
--d3 graph to show most common type of road to travel down for each vehicle type
*/


let testObject = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "pointId": 6023,
        "roadType": "Major",
        "roadName": "M5",
        "startJunction": "28",
        "endJunction": "27",
        "pushbikes": 0,
        "motorbikes": 137,
        "cars": 41341,
        "buses": 384,
        "lgvs": 4851,
        "hgvs": 7004,
        "allMotorVehicles": 53717,
        "filterSum": 53717
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.37083326,
          50.90096735
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 6407,
        "roadType": "Major",
        "roadName": "A379",
        "startJunction": "Sannerville Way Rndbt",
        "endJunction": "Glasshouse Lane",
        "pushbikes": 147,
        "motorbikes": 668,
        "cars": 28923,
        "buses": 260,
        "lgvs": 4188,
        "hgvs": 1219,
        "allMotorVehicles": 35258,
        "filterSum": 35258
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.50213962,
          50.69432488
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 6409,
        "roadType": "Major",
        "roadName": "A38",
        "startJunction": "B3380 Cave Inn Rndbt",
        "endJunction": "B3352",
        "pushbikes": 1,
        "motorbikes": 327,
        "cars": 27456,
        "buses": 176,
        "lgvs": 4404,
        "hgvs": 2842,
        "allMotorVehicles": 35205,
        "filterSum": 35205
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.76728572,
          50.49865285
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 6410,
        "roadType": "Major",
        "roadName": "A38",
        "startJunction": "LA Boundary",
        "endJunction": "B3416 mid-junction",
        "pushbikes": 9,
        "motorbikes": 689,
        "cars": 43449,
        "buses": 297,
        "lgvs": 5356,
        "hgvs": 2731,
        "allMotorVehicles": 52522,
        "filterSum": 52522
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.04053934,
          50.37669967
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 6418,
        "roadType": "Major",
        "roadName": "A39",
        "startJunction": "Westaway Plain",
        "endJunction": "B3230",
        "pushbikes": 23,
        "motorbikes": 125,
        "cars": 5981,
        "buses": 67,
        "lgvs": 685,
        "hgvs": 123,
        "allMotorVehicles": 6981,
        "filterSum": 6981
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.05555222,
          51.09621744
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 6419,
        "roadType": "Major",
        "roadName": "A39",
        "startJunction": "LA Boundary",
        "endJunction": "Clovelly Rd roundabout",
        "pushbikes": 2,
        "motorbikes": 23,
        "cars": 4650,
        "buses": 47,
        "lgvs": 621,
        "hgvs": 222,
        "allMotorVehicles": 5563,
        "filterSum": 5563
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.28122928,
          50.9919932
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 6878,
        "roadType": "Major",
        "roadName": "A303",
        "startJunction": "A30",
        "endJunction": "B3170",
        "pushbikes": 1,
        "motorbikes": 77,
        "cars": 7541,
        "buses": 29,
        "lgvs": 920,
        "hgvs": 650,
        "allMotorVehicles": 9217,
        "filterSum": 9217
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.10833861,
          50.86623749
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 6972,
        "roadType": "Major",
        "roadName": "A358",
        "startJunction": "A3052",
        "endJunction": "A358 spur",
        "pushbikes": 21,
        "motorbikes": 90,
        "cars": 4917,
        "buses": 62,
        "lgvs": 477,
        "hgvs": 158,
        "allMotorVehicles": 5704,
        "filterSum": 5704
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.02904575,
          50.75005702
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 7006,
        "roadType": "Major",
        "roadName": "A376",
        "startJunction": "B3179",
        "endJunction": "A3052",
        "pushbikes": 32,
        "motorbikes": 277,
        "cars": 17830,
        "buses": 125,
        "lgvs": 2282,
        "hgvs": 670,
        "allMotorVehicles": 21184,
        "filterSum": 21184
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.44994583,
          50.70061577
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 7015,
        "roadType": "Major",
        "roadName": "A380",
        "startJunction": "A381/A383",
        "endJunction": "B3195",
        "pushbikes": 1,
        "motorbikes": 175,
        "cars": 19722,
        "buses": 199,
        "lgvs": 2784,
        "hgvs": 1315,
        "allMotorVehicles": 24195,
        "filterSum": 24195
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.59358764,
          50.55997052
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 7016,
        "roadType": "Major",
        "roadName": "A381",
        "startJunction": "A380/A383",
        "endJunction": "Broadmeadow Lane, Teignmouth",
        "pushbikes": 8,
        "motorbikes": 75,
        "cars": 11140,
        "buses": 148,
        "lgvs": 1363,
        "hgvs": 467,
        "allMotorVehicles": 13193,
        "filterSum": 13193
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.55399144,
          50.54944371
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 7018,
        "roadType": "Major",
        "roadName": "A381",
        "startJunction": "B3197",
        "endJunction": "A379",
        "pushbikes": 3,
        "motorbikes": 67,
        "cars": 4601,
        "buses": 63,
        "lgvs": 623,
        "hgvs": 75,
        "allMotorVehicles": 5429,
        "filterSum": 5429
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.79786139,
          50.28050245
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 7019,
        "roadType": "Major",
        "roadName": "A382",
        "startJunction": "B3344",
        "endJunction": "B3212",
        "pushbikes": 6,
        "motorbikes": 26,
        "cars": 2528,
        "buses": 45,
        "lgvs": 485,
        "hgvs": 155,
        "allMotorVehicles": 3239,
        "filterSum": 3239
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.69751901,
          50.61543119
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 7020,
        "roadType": "Major",
        "roadName": "A383",
        "startJunction": "A38(T)",
        "endJunction": "Chercombe Bridge Rd, Newton Abbot",
        "pushbikes": 15,
        "motorbikes": 158,
        "cars": 6714,
        "buses": 72,
        "lgvs": 1015,
        "hgvs": 340,
        "allMotorVehicles": 8299,
        "filterSum": 8299
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.69462883,
          50.53498008
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 7022,
        "roadType": "Major",
        "roadName": "A385",
        "startJunction": "A381",
        "endJunction": "A381",
        "pushbikes": 120,
        "motorbikes": 333,
        "cars": 21180,
        "buses": 258,
        "lgvs": 2790,
        "hgvs": 747,
        "allMotorVehicles": 25308,
        "filterSum": 25308
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.69062437,
          50.43475769
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 7024,
        "roadType": "Major",
        "roadName": "A386",
        "startJunction": "C Road HATHERLEIGH ROAD",
        "endJunction": "A3072 Lamerton Cross",
        "pushbikes": 7,
        "motorbikes": 33,
        "cars": 2787,
        "buses": 46,
        "lgvs": 545,
        "hgvs": 359,
        "allMotorVehicles": 3770,
        "filterSum": 3770
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.0251756,
          50.77298219
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 7025,
        "roadType": "Major",
        "roadName": "A386",
        "startJunction": "B3357",
        "endJunction": "C road to Lydford",
        "pushbikes": 25,
        "motorbikes": 35,
        "cars": 4609,
        "buses": 85,
        "lgvs": 602,
        "hgvs": 213,
        "allMotorVehicles": 5544,
        "filterSum": 5544
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.11950275,
          50.56894143
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 7029,
        "roadType": "Major",
        "roadName": "A388",
        "startJunction": "A3072",
        "endJunction": "B3227",
        "pushbikes": 0,
        "motorbikes": 20,
        "cars": 1825,
        "buses": 30,
        "lgvs": 446,
        "hgvs": 254,
        "allMotorVehicles": 2575,
        "filterSum": 2575
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.27627325,
          50.89066702
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 7041,
        "roadType": "Major",
        "roadName": "A396",
        "startJunction": "A3072",
        "endJunction": "Ashley Rise, Tiverton",
        "pushbikes": 10,
        "motorbikes": 109,
        "cars": 5971,
        "buses": 111,
        "lgvs": 682,
        "hgvs": 241,
        "allMotorVehicles": 7114,
        "filterSum": 7114
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.49408832,
          50.88624377
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 7576,
        "roadType": "Major",
        "roadName": "A3052",
        "startJunction": "A376 Exmouth Road",
        "endJunction": "B3180",
        "pushbikes": 24,
        "motorbikes": 131,
        "cars": 9550,
        "buses": 138,
        "lgvs": 1605,
        "hgvs": 631,
        "allMotorVehicles": 12055,
        "filterSum": 12055
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.41757807,
          50.70730926
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 7586,
        "roadType": "Major",
        "roadName": "A3072",
        "startJunction": "A3124 The Barton",
        "endJunction": "A377 Copplestone",
        "pushbikes": 2,
        "motorbikes": 34,
        "cars": 1906,
        "buses": 12,
        "lgvs": 308,
        "hgvs": 234,
        "allMotorVehicles": 2494,
        "filterSum": 2494
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.84612845,
          50.8004172
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 7587,
        "roadType": "Major",
        "roadName": "A388",
        "startJunction": "A3072",
        "endJunction": "A3072",
        "pushbikes": 1,
        "motorbikes": 33,
        "cars": 3207,
        "buses": 31,
        "lgvs": 522,
        "hgvs": 255,
        "allMotorVehicles": 4048,
        "filterSum": 4048
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.35239021,
          50.80821106
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 8027,
        "roadType": "Major",
        "roadName": "A361",
        "startJunction": "A396",
        "endJunction": "M5",
        "pushbikes": 4,
        "motorbikes": 113,
        "cars": 14288,
        "buses": 113,
        "lgvs": 2724,
        "hgvs": 1921,
        "allMotorVehicles": 19159,
        "filterSum": 19159
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.42400762,
          50.91916188
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 8078,
        "roadType": "Major",
        "roadName": "A386",
        "startJunction": "C road to Lydford",
        "endJunction": "Station Rd",
        "pushbikes": 7,
        "motorbikes": 29,
        "cars": 3670,
        "buses": 41,
        "lgvs": 620,
        "hgvs": 319,
        "allMotorVehicles": 4679,
        "filterSum": 4679
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.08992607,
          50.65460439
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 8324,
        "roadType": "Major",
        "roadName": "A381",
        "startJunction": "A382",
        "endJunction": "Forde Park",
        "pushbikes": 87,
        "motorbikes": 179,
        "cars": 13512,
        "buses": 115,
        "lgvs": 1919,
        "hgvs": 495,
        "allMotorVehicles": 16220,
        "filterSum": 16220
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.60975698,
          50.52898987
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 8403,
        "roadType": "Major",
        "roadName": "A380",
        "startJunction": "Aller Brake Rd",
        "endJunction": "A381",
        "pushbikes": 108,
        "motorbikes": 392,
        "cars": 24750,
        "buses": 529,
        "lgvs": 3338,
        "hgvs": 1428,
        "allMotorVehicles": 30437,
        "filterSum": 30437
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.59086388,
          50.51890695
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 8528,
        "roadType": "Major",
        "roadName": "A386",
        "startJunction": "Old Barnstaple Rd",
        "endJunction": "A39",
        "pushbikes": 22,
        "motorbikes": 97,
        "cars": 4975,
        "buses": 116,
        "lgvs": 711,
        "hgvs": 210,
        "allMotorVehicles": 6109,
        "filterSum": 6109
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.1974557,
          51.02165991
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 8621,
        "roadType": "Major",
        "roadName": "A381",
        "startJunction": "A3122 Totnes Cross",
        "endJunction": "C Plymouth Road",
        "pushbikes": 7,
        "motorbikes": 41,
        "cars": 4965,
        "buses": 60,
        "lgvs": 650,
        "hgvs": 309,
        "allMotorVehicles": 6025,
        "filterSum": 6025
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.72105803,
          50.36415873
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 8622,
        "roadType": "Major",
        "roadName": "A3079",
        "startJunction": "A3072 Dunsland Cross",
        "endJunction": "A386 Fowley Cross Rndbt",
        "pushbikes": 13,
        "motorbikes": 12,
        "cars": 1876,
        "buses": 43,
        "lgvs": 362,
        "hgvs": 194,
        "allMotorVehicles": 2487,
        "filterSum": 2487
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.20982844,
          50.77862204
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 8683,
        "roadType": "Major",
        "roadName": "A35",
        "startJunction": "A358",
        "endJunction": "LA Boundary",
        "pushbikes": 0,
        "motorbikes": 18,
        "cars": 6425,
        "buses": 31,
        "lgvs": 909,
        "hgvs": 490,
        "allMotorVehicles": 7873,
        "filterSum": 7873
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -2.99681295,
          50.76747751
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16023,
        "roadType": "Major",
        "roadName": "M5",
        "startJunction": "30",
        "endJunction": "29",
        "pushbikes": 0,
        "motorbikes": 224,
        "cars": 44330,
        "buses": 275,
        "lgvs": 6173,
        "hgvs": 6737,
        "allMotorVehicles": 57739,
        "filterSum": 57739
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.46182927,
          50.71845384
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16296,
        "roadType": "Major",
        "roadName": "A30",
        "startJunction": "A35",
        "endJunction": "A303(T)",
        "pushbikes": 3,
        "motorbikes": 131,
        "cars": 7876,
        "buses": 42,
        "lgvs": 1196,
        "hgvs": 697,
        "allMotorVehicles": 9942,
        "filterSum": 9942
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.16533556,
          50.81544806
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16297,
        "roadType": "Major",
        "roadName": "A30",
        "startJunction": null,
        "endJunction": null,
        "pushbikes": 4,
        "motorbikes": 147,
        "cars": 18134,
        "buses": 89,
        "lgvs": 2479,
        "hgvs": 1230,
        "allMotorVehicles": 22079,
        "filterSum": 22079
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.27775718,
          50.77367625
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16382,
        "roadType": "Major",
        "roadName": "A379",
        "startJunction": "Bridge road/Sannerville Way Rndbt",
        "endJunction": "A38 Mid Junction",
        "pushbikes": 10,
        "motorbikes": 281,
        "cars": 11983,
        "buses": 124,
        "lgvs": 1911,
        "hgvs": 968,
        "allMotorVehicles": 15267,
        "filterSum": 15267
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.5246692,
          50.69047991
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16383,
        "roadType": "Major",
        "roadName": "A38",
        "startJunction": "A382 Newton Road",
        "endJunction": "B3334",
        "pushbikes": 7,
        "motorbikes": 203,
        "cars": 29185,
        "buses": 184,
        "lgvs": 4518,
        "hgvs": 3167,
        "allMotorVehicles": 37257,
        "filterSum": 37257
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.64512044,
          50.57211459
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16384,
        "roadType": "Major",
        "roadName": "A38",
        "startJunction": "B3372",
        "endJunction": "A385 S of Sion Abbey",
        "pushbikes": 0,
        "motorbikes": 164,
        "cars": 24175,
        "buses": 116,
        "lgvs": 4011,
        "hgvs": 2569,
        "allMotorVehicles": 31035,
        "filterSum": 31035
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.83125066,
          50.41888583
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16951,
        "roadType": "Major",
        "roadName": "A361",
        "startJunction": "Alexandra Road",
        "endJunction": "Whiddon Drive",
        "pushbikes": 77,
        "motorbikes": 189,
        "cars": 17556,
        "buses": 131,
        "lgvs": 2284,
        "hgvs": 1025,
        "allMotorVehicles": 21185,
        "filterSum": 21185
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.0426138,
          51.07486037
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16970,
        "roadType": "Major",
        "roadName": "A377",
        "startJunction": "A3072",
        "endJunction": "B3220",
        "pushbikes": 8,
        "motorbikes": 41,
        "cars": 3973,
        "buses": 27,
        "lgvs": 557,
        "hgvs": 290,
        "allMotorVehicles": 4888,
        "filterSum": 4888
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.77502026,
          50.83012023
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16971,
        "roadType": "Major",
        "roadName": "A377",
        "startJunction": "A3015 Western Way",
        "endJunction": "B3183 New North Road",
        "pushbikes": 97,
        "motorbikes": 75,
        "cars": 8364,
        "buses": 69,
        "lgvs": 1174,
        "hgvs": 617,
        "allMotorVehicles": 10299,
        "filterSum": 10299
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.54142133,
          50.7264217
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16972,
        "roadType": "Major",
        "roadName": "A377",
        "startJunction": "B3123",
        "endJunction": "A3015 Nr Frog St",
        "pushbikes": 103,
        "motorbikes": 167,
        "cars": 16130,
        "buses": 115,
        "lgvs": 2605,
        "hgvs": 1021,
        "allMotorVehicles": 20038,
        "filterSum": 20038
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.53771693,
          50.70848401
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16977,
        "roadType": "Major",
        "roadName": "A380",
        "startJunction": "B3195",
        "endJunction": "B3192",
        "pushbikes": 1,
        "motorbikes": 252,
        "cars": 20989,
        "buses": 128,
        "lgvs": 3161,
        "hgvs": 1242,
        "allMotorVehicles": 25772,
        "filterSum": 25772
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.56963891,
          50.59555056
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16981,
        "roadType": "Major",
        "roadName": "A381",
        "startJunction": "East St",
        "endJunction": "Ogwell Rd",
        "pushbikes": 27,
        "motorbikes": 318,
        "cars": 10501,
        "buses": 79,
        "lgvs": 1440,
        "hgvs": 237,
        "allMotorVehicles": 12575,
        "filterSum": 12575
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.62215885,
          50.51622656
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16982,
        "roadType": "Major",
        "roadName": "A381",
        "startJunction": "A3122",
        "endJunction": "Plymouth Road",
        "pushbikes": 22,
        "motorbikes": 190,
        "cars": 9267,
        "buses": 110,
        "lgvs": 1537,
        "hgvs": 392,
        "allMotorVehicles": 11496,
        "filterSum": 11496
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.69064964,
          50.42756224
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16984,
        "roadType": "Major",
        "roadName": "A385",
        "startJunction": "A384",
        "endJunction": "A381",
        "pushbikes": 78,
        "motorbikes": 182,
        "cars": 12060,
        "buses": 161,
        "lgvs": 1746,
        "hgvs": 689,
        "allMotorVehicles": 14838,
        "filterSum": 14838
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.70410078,
          50.44535365
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16988,
        "roadType": "Major",
        "roadName": "A386",
        "startJunction": "A3079",
        "endJunction": "C Road HATHERLEIGH ROAD",
        "pushbikes": 3,
        "motorbikes": 10,
        "cars": 1253,
        "buses": 7,
        "lgvs": 238,
        "hgvs": 326,
        "allMotorVehicles": 1834,
        "filterSum": 1834
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.03311258,
          50.73686907
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 16989,
        "roadType": "Major",
        "roadName": "A386",
        "startJunction": "Tamerton Rd roundabout",
        "endJunction": "B3212 roundabout",
        "pushbikes": 26,
        "motorbikes": 219,
        "cars": 12313,
        "buses": 159,
        "lgvs": 1487,
        "hgvs": 433,
        "allMotorVehicles": 14611,
        "filterSum": 14611
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.10072669,
          50.46584919
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 17004,
        "roadType": "Major",
        "roadName": "A396",
        "startJunction": "B3227",
        "endJunction": "B3227",
        "pushbikes": 5,
        "motorbikes": 4,
        "cars": 1530,
        "buses": 10,
        "lgvs": 214,
        "hgvs": 90,
        "allMotorVehicles": 1848,
        "filterSum": 1848
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.49693083,
          50.97485107
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 17543,
        "roadType": "Major",
        "roadName": "A3052",
        "startJunction": "B3174 Hollyhead Road",
        "endJunction": "B3161 Coly Road",
        "pushbikes": 32,
        "motorbikes": 68,
        "cars": 5131,
        "buses": 123,
        "lgvs": 579,
        "hgvs": 133,
        "allMotorVehicles": 6034,
        "filterSum": 6034
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.06396495,
          50.72717127
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 17544,
        "roadType": "Major",
        "roadName": "A3052",
        "startJunction": "B3178 Exmouth Road",
        "endJunction": "B3176 / C",
        "pushbikes": 20,
        "motorbikes": 62,
        "cars": 10991,
        "buses": 142,
        "lgvs": 1307,
        "hgvs": 298,
        "allMotorVehicles": 12800,
        "filterSum": 12800
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.27572043,
          50.69878613
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 17555,
        "roadType": "Major",
        "roadName": "A3072",
        "startJunction": "C Road nr Beara Court",
        "endJunction": "A386",
        "pushbikes": 4,
        "motorbikes": 4,
        "cars": 1179,
        "buses": 5,
        "lgvs": 297,
        "hgvs": 146,
        "allMotorVehicles": 1631,
        "filterSum": 1631
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.1305683,
          50.81373431
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 17787,
        "roadType": "Major",
        "roadName": "A30",
        "startJunction": "A382 Mill Farm",
        "endJunction": "A377",
        "pushbikes": 2,
        "motorbikes": 115,
        "cars": 19036,
        "buses": 100,
        "lgvs": 2188,
        "hgvs": 2210,
        "allMotorVehicles": 23649,
        "filterSum": 23649
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.70157934,
          50.72783594
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 17873,
        "roadType": "Major",
        "roadName": "A35",
        "startJunction": "Monkton Road/King's Road Jct",
        "endJunction": "A30(T)",
        "pushbikes": 29,
        "motorbikes": 200,
        "cars": 11907,
        "buses": 110,
        "lgvs": 1392,
        "hgvs": 536,
        "allMotorVehicles": 14145,
        "filterSum": 14145
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.18061886,
          50.80230859
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 18081,
        "roadType": "Major",
        "roadName": "A377",
        "startJunction": "A30",
        "endJunction": "/B3123",
        "pushbikes": 20,
        "motorbikes": 116,
        "cars": 14340,
        "buses": 71,
        "lgvs": 2386,
        "hgvs": 1036,
        "allMotorVehicles": 17949,
        "filterSum": 17949
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.54093748,
          50.70217311
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 18513,
        "roadType": "Major",
        "roadName": "A39",
        "startJunction": "Clovelly Rd roundabout",
        "endJunction": "A386",
        "pushbikes": 14,
        "motorbikes": 91,
        "cars": 9136,
        "buses": 79,
        "lgvs": 904,
        "hgvs": 426,
        "allMotorVehicles": 10636,
        "filterSum": 10636
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.22579483,
          51.02861492
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 18566,
        "roadType": "Major",
        "roadName": "A361",
        "startJunction": "B3227",
        "endJunction": "A396 Bolham Road",
        "pushbikes": 0,
        "motorbikes": 78,
        "cars": 7319,
        "buses": 40,
        "lgvs": 1613,
        "hgvs": 988,
        "allMotorVehicles": 10038,
        "filterSum": 10038
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.71112989,
          50.9932942
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 18602,
        "roadType": "Major",
        "roadName": "A3122",
        "startJunction": "A3122 N - Eastern Spur of North South triangle",
        "endJunction": "A379 Townstall Road",
        "pushbikes": 6,
        "motorbikes": 58,
        "cars": 5169,
        "buses": 79,
        "lgvs": 739,
        "hgvs": 178,
        "allMotorVehicles": 6223,
        "filterSum": 6223
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.68853833,
          50.36423086
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 18603,
        "roadType": "Major",
        "roadName": "A361",
        "startJunction": "B3230",
        "endJunction": "B3343",
        "pushbikes": 12,
        "motorbikes": 88,
        "cars": 5589,
        "buses": 131,
        "lgvs": 623,
        "hgvs": 221,
        "allMotorVehicles": 6652,
        "filterSum": 6652
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.12911033,
          51.18483376
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 26023,
        "roadType": "Major",
        "roadName": "M5",
        "startJunction": "27",
        "endJunction": "LA Boundary",
        "pushbikes": 0,
        "motorbikes": 185,
        "cars": 35293,
        "buses": 335,
        "lgvs": 6076,
        "hgvs": 6926,
        "allMotorVehicles": 48815,
        "filterSum": 48815
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.27882385,
          50.94722764
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 26410,
        "roadType": "Major",
        "roadName": "A379",
        "startJunction": "A3015 Topsham Road",
        "endJunction": "A3015",
        "pushbikes": 93,
        "motorbikes": 328,
        "cars": 24333,
        "buses": 147,
        "lgvs": 4867,
        "hgvs": 1597,
        "allMotorVehicles": 31272,
        "filterSum": 31272
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.49037337,
          50.70280375
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 26411,
        "roadType": "Major",
        "roadName": "A38",
        "startJunction": "A380",
        "endJunction": "A379",
        "pushbikes": 4,
        "motorbikes": 781,
        "cars": 50659,
        "buses": 423,
        "lgvs": 8385,
        "hgvs": 4800,
        "allMotorVehicles": 65048,
        "filterSum": 65048
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.53886448,
          50.66350206
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 26412,
        "roadType": "Major",
        "roadName": "A38",
        "startJunction": "B3352 slip road",
        "endJunction": "A383",
        "pushbikes": 2,
        "motorbikes": 255,
        "cars": 29111,
        "buses": 214,
        "lgvs": 4222,
        "hgvs": 2668,
        "allMotorVehicles": 36470,
        "filterSum": 36470
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.74899489,
          50.51690781
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 26421,
        "roadType": "Major",
        "roadName": "A39",
        "startJunction": "B3230",
        "endJunction": "A399",
        "pushbikes": 9,
        "motorbikes": 9,
        "cars": 1450,
        "buses": 16,
        "lgvs": 168,
        "hgvs": 73,
        "allMotorVehicles": 1716,
        "filterSum": 1716
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.00284796,
          51.14569593
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 27005,
        "roadType": "Major",
        "roadName": "A358",
        "startJunction": "A358 spur",
        "endJunction": "B3167",
        "pushbikes": 15,
        "motorbikes": 112,
        "cars": 5748,
        "buses": 57,
        "lgvs": 733,
        "hgvs": 351,
        "allMotorVehicles": 7001,
        "filterSum": 7001
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -2.98463708,
          50.79540481
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 27019,
        "roadType": "Major",
        "roadName": "A361",
        "startJunction": "A3123/B3343",
        "endJunction": "Chaddiford Lane, Barnstaple",
        "pushbikes": 4,
        "motorbikes": 99,
        "cars": 4236,
        "buses": 187,
        "lgvs": 720,
        "hgvs": 219,
        "allMotorVehicles": 5461,
        "filterSum": 5461
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.1457895,
          51.14495826
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 27037,
        "roadType": "Major",
        "roadName": "A377",
        "startJunction": "C Road (Station Road/West Town Road",
        "endJunction": "A3072",
        "pushbikes": 13,
        "motorbikes": 237,
        "cars": 11206,
        "buses": 136,
        "lgvs": 1416,
        "hgvs": 542,
        "allMotorVehicles": 13537,
        "filterSum": 13537
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.63268041,
          50.78381569
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 27040,
        "roadType": "Major",
        "roadName": "A379",
        "startJunction": "High Street, Dawlish",
        "endJunction": "LITTLE WEEK ROAD",
        "pushbikes": 33,
        "motorbikes": 140,
        "cars": 5887,
        "buses": 57,
        "lgvs": 731,
        "hgvs": 151,
        "allMotorVehicles": 6966,
        "filterSum": 6966
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.46413364,
          50.61050494
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 27044,
        "roadType": "Major",
        "roadName": "A379",
        "startJunction": "LA Boundary",
        "endJunction": "Red Lion Hill",
        "pushbikes": 36,
        "motorbikes": 115,
        "cars": 9404,
        "buses": 71,
        "lgvs": 971,
        "hgvs": 256,
        "allMotorVehicles": 10817,
        "filterSum": 10817
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.03946228,
          50.35027539
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 27045,
        "roadType": "Major",
        "roadName": "A381",
        "startJunction": "Forde Park",
        "endJunction": "A380",
        "pushbikes": 113,
        "motorbikes": 1359,
        "cars": 34246,
        "buses": 443,
        "lgvs": 3916,
        "hgvs": 1181,
        "allMotorVehicles": 41145,
        "filterSum": 41145
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.59552366,
          50.52531859
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 27051,
        "roadType": "Major",
        "roadName": "A384",
        "startJunction": "A38(T)",
        "endJunction": "C road to Staverton",
        "pushbikes": 12,
        "motorbikes": 82,
        "cars": 7405,
        "buses": 106,
        "lgvs": 977,
        "hgvs": 378,
        "allMotorVehicles": 8948,
        "filterSum": 8948
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.76315317,
          50.48044906
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 27053,
        "roadType": "Major",
        "roadName": "A385",
        "startJunction": "A381",
        "endJunction": "C road towards Aish",
        "pushbikes": 34,
        "motorbikes": 213,
        "cars": 14425,
        "buses": 156,
        "lgvs": 2073,
        "hgvs": 487,
        "allMotorVehicles": 17354,
        "filterSum": 17354
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.6768595,
          50.43176413
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 27054,
        "roadType": "Major",
        "roadName": "A386",
        "startJunction": "A3072 Lamerton Cross",
        "endJunction": "A3072 Hatherleigh Rndbt",
        "pushbikes": 0,
        "motorbikes": 22,
        "cars": 2346,
        "buses": 39,
        "lgvs": 429,
        "hgvs": 268,
        "allMotorVehicles": 3104,
        "filterSum": 3104
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.03250995,
          50.78184826
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 27059,
        "roadType": "Major",
        "roadName": "A388",
        "startJunction": "B3227",
        "endJunction": "A386",
        "pushbikes": 5,
        "motorbikes": 28,
        "cars": 1769,
        "buses": 46,
        "lgvs": 378,
        "hgvs": 132,
        "allMotorVehicles": 2353,
        "filterSum": 2353
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.20881431,
          50.95851717
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 27631,
        "roadType": "Major",
        "roadName": "A3052",
        "startJunction": "B3180",
        "endJunction": "B3178 Exmouth Road",
        "pushbikes": 7,
        "motorbikes": 83,
        "cars": 8410,
        "buses": 114,
        "lgvs": 1214,
        "hgvs": 273,
        "allMotorVehicles": 10094,
        "filterSum": 10094
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.34236156,
          50.70190464
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 27640,
        "roadType": "Major",
        "roadName": "A3072",
        "startJunction": "A377",
        "endJunction": "A377 Copplestone",
        "pushbikes": 11,
        "motorbikes": 26,
        "cars": 1915,
        "buses": 23,
        "lgvs": 425,
        "hgvs": 202,
        "allMotorVehicles": 2591,
        "filterSum": 2591
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.63324439,
          50.79999572
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 27641,
        "roadType": "Major",
        "roadName": "A3072",
        "startJunction": "A388",
        "endJunction": "A3079 Dunsland Cross",
        "pushbikes": 4,
        "motorbikes": 20,
        "cars": 2765,
        "buses": 43,
        "lgvs": 633,
        "hgvs": 260,
        "allMotorVehicles": 3721,
        "filterSum": 3721
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.27243482,
          50.81178442
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 28353,
        "roadType": "Major",
        "roadName": "A381",
        "startJunction": "A385",
        "endJunction": "East St",
        "pushbikes": 7,
        "motorbikes": 98,
        "cars": 5696,
        "buses": 63,
        "lgvs": 663,
        "hgvs": 223,
        "allMotorVehicles": 6743,
        "filterSum": 6743
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.64267097,
          50.47321867
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 28432,
        "roadType": "Major",
        "roadName": "A35",
        "startJunction": "A375",
        "endJunction": "A373",
        "pushbikes": 55,
        "motorbikes": 224,
        "cars": 11117,
        "buses": 94,
        "lgvs": 1423,
        "hgvs": 368,
        "allMotorVehicles": 13226,
        "filterSum": 13226
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.19751739,
          50.79719019
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 28525,
        "roadType": "Major",
        "roadName": "A396",
        "startJunction": "B3227",
        "endJunction": "LA Boundary",
        "pushbikes": 9,
        "motorbikes": 11,
        "cars": 916,
        "buses": 26,
        "lgvs": 161,
        "hgvs": 32,
        "allMotorVehicles": 1146,
        "filterSum": 1146
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.51902137,
          51.01449427
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 28748,
        "roadType": "Major",
        "roadName": "A381",
        "startJunction": "B3264",
        "endJunction": "C Road Field Study Centre",
        "pushbikes": 3,
        "motorbikes": 10,
        "cars": 2901,
        "buses": 15,
        "lgvs": 522,
        "hgvs": 275,
        "allMotorVehicles": 3723,
        "filterSum": 3723
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.7709473,
          50.31169365
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 28749,
        "roadType": "Major",
        "roadName": "A3121",
        "startJunction": "A379",
        "endJunction": "A38",
        "pushbikes": 22,
        "motorbikes": 33,
        "cars": 1705,
        "buses": 9,
        "lgvs": 212,
        "hgvs": 89,
        "allMotorVehicles": 2048,
        "filterSum": 2048
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.89952483,
          50.36610162
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 28750,
        "roadType": "Major",
        "roadName": "A3123",
        "startJunction": "A361",
        "endJunction": "A399",
        "pushbikes": 3,
        "motorbikes": 12,
        "cars": 1012,
        "buses": 26,
        "lgvs": 166,
        "hgvs": 53,
        "allMotorVehicles": 1269,
        "filterSum": 1269
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.0042852,
          51.17885604
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 36195,
        "roadType": "Major",
        "roadName": "M5",
        "startJunction": "29",
        "endJunction": "28",
        "pushbikes": 0,
        "motorbikes": 178,
        "cars": 37675,
        "buses": 196,
        "lgvs": 5753,
        "hgvs": 6094,
        "allMotorVehicles": 49896,
        "filterSum": 49896
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.44124535,
          50.79964878
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 36325,
        "roadType": "Major",
        "roadName": "A30",
        "startJunction": "A35",
        "endJunction": "A35",
        "pushbikes": 0,
        "motorbikes": 136,
        "cars": 13752,
        "buses": 64,
        "lgvs": 1625,
        "hgvs": 1255,
        "allMotorVehicles": 16832,
        "filterSum": 16832
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.19340821,
          50.80298779
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 36328,
        "roadType": "Major",
        "roadName": "A30",
        "startJunction": "A388 Liftondown",
        "endJunction": "A386 bridge (mid-junction)",
        "pushbikes": 2,
        "motorbikes": 80,
        "cars": 10605,
        "buses": 45,
        "lgvs": 1556,
        "hgvs": 1658,
        "allMotorVehicles": 13944,
        "filterSum": 13944
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.26545304,
          50.66738613
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 36417,
        "roadType": "Major",
        "roadName": "A38",
        "startJunction": "B3344",
        "endJunction": "B3344 Chudleigh Rocks turn-off",
        "pushbikes": 0,
        "motorbikes": 195,
        "cars": 27167,
        "buses": 157,
        "lgvs": 3620,
        "hgvs": 2834,
        "allMotorVehicles": 33973,
        "filterSum": 33973
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.62575021,
          50.58376357
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 36418,
        "roadType": "Major",
        "roadName": "A38",
        "startJunction": "A385 South of Syon Abbey",
        "endJunction": "B3380 Cave In Turn-off",
        "pushbikes": 0,
        "motorbikes": 328,
        "cars": 24186,
        "buses": 165,
        "lgvs": 3657,
        "hgvs": 2579,
        "allMotorVehicles": 30915,
        "filterSum": 30915
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.7871848,
          50.47108852
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37061,
        "roadType": "Major",
        "roadName": "A375",
        "startJunction": "C Seaton Road",
        "endJunction": "A35",
        "pushbikes": 21,
        "motorbikes": 139,
        "cars": 10051,
        "buses": 66,
        "lgvs": 898,
        "hgvs": 312,
        "allMotorVehicles": 11466,
        "filterSum": 11466
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.20210183,
          50.79336598
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37064,
        "roadType": "Major",
        "roadName": "A377",
        "startJunction": "A396 Stoke Road/Cowley Bridge Road Rndbt",
        "endJunction": "C Road (Station Road/West Town Road",
        "pushbikes": 18,
        "motorbikes": 134,
        "cars": 10977,
        "buses": 137,
        "lgvs": 1473,
        "hgvs": 557,
        "allMotorVehicles": 13278,
        "filterSum": 13278
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.55350196,
          50.7532412
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37065,
        "roadType": "Major",
        "roadName": "A376",
        "startJunction": "Summer Lane",
        "endJunction": "B3179",
        "pushbikes": 81,
        "motorbikes": 248,
        "cars": 14553,
        "buses": 176,
        "lgvs": 1618,
        "hgvs": 413,
        "allMotorVehicles": 17008,
        "filterSum": 17008
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.4157642,
          50.64707636
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37072,
        "roadType": "Major",
        "roadName": "A380",
        "startJunction": "A381",
        "endJunction": "A381/A383",
        "pushbikes": 11,
        "motorbikes": 658,
        "cars": 28551,
        "buses": 233,
        "lgvs": 4219,
        "hgvs": 1240,
        "allMotorVehicles": 34901,
        "filterSum": 34901
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.5870256,
          50.53694661
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37074,
        "roadType": "Major",
        "roadName": "A381",
        "startJunction": "C Plymouth Road",
        "endJunction": "A385 Ashburton Road",
        "pushbikes": 46,
        "motorbikes": 126,
        "cars": 13080,
        "buses": 171,
        "lgvs": 1749,
        "hgvs": 380,
        "allMotorVehicles": 15506,
        "filterSum": 15506
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.69376518,
          50.43201384
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37076,
        "roadType": "Major",
        "roadName": "A382",
        "startJunction": "A38",
        "endJunction": "B3344",
        "pushbikes": 16,
        "motorbikes": 104,
        "cars": 8945,
        "buses": 55,
        "lgvs": 1344,
        "hgvs": 329,
        "allMotorVehicles": 10777,
        "filterSum": 10777
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.66126842,
          50.5718853
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37079,
        "roadType": "Major",
        "roadName": "A385",
        "startJunction": "A385 split",
        "endJunction": "A384",
        "pushbikes": 9,
        "motorbikes": 50,
        "cars": 3925,
        "buses": 56,
        "lgvs": 520,
        "hgvs": 231,
        "allMotorVehicles": 4782,
        "filterSum": 4782
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.76126894,
          50.42975209
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37080,
        "roadType": "Major",
        "roadName": "A386",
        "startJunction": "B3227",
        "endJunction": "A388",
        "pushbikes": 10,
        "motorbikes": 63,
        "cars": 3773,
        "buses": 76,
        "lgvs": 564,
        "hgvs": 362,
        "allMotorVehicles": 4838,
        "filterSum": 4838
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.17381404,
          50.95917419
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37082,
        "roadType": "Major",
        "roadName": "A386",
        "startJunction": "B3212  Dousland Road",
        "endJunction": "A390",
        "pushbikes": 21,
        "motorbikes": 152,
        "cars": 11296,
        "buses": 156,
        "lgvs": 1312,
        "hgvs": 442,
        "allMotorVehicles": 13358,
        "filterSum": 13358
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.11710249,
          50.51538913
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37084,
        "roadType": "Major",
        "roadName": "A388",
        "startJunction": "LA Boundary",
        "endJunction": "A3072",
        "pushbikes": 0,
        "motorbikes": 15,
        "cars": 1837,
        "buses": 12,
        "lgvs": 381,
        "hgvs": 171,
        "allMotorVehicles": 2416,
        "filterSum": 2416
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.33482413,
          50.77618555
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37098,
        "roadType": "Major",
        "roadName": "A396",
        "startJunction": "Stoke Hill",
        "endJunction": "A3072",
        "pushbikes": 27,
        "motorbikes": 59,
        "cars": 5997,
        "buses": 82,
        "lgvs": 755,
        "hgvs": 237,
        "allMotorVehicles": 7130,
        "filterSum": 7130
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.49359919,
          50.78999685
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37672,
        "roadType": "Major",
        "roadName": "A3052",
        "startJunction": "A358",
        "endJunction": "LA Boundary",
        "pushbikes": 17,
        "motorbikes": 63,
        "cars": 3460,
        "buses": 45,
        "lgvs": 346,
        "hgvs": 115,
        "allMotorVehicles": 4029,
        "filterSum": 4029
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -2.99290668,
          50.71691676
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37673,
        "roadType": "Major",
        "roadName": "A3052",
        "startJunction": "road to Stowfrod Rise",
        "endJunction": "A375 School Street/Sidford Road",
        "pushbikes": 33,
        "motorbikes": 55,
        "cars": 7457,
        "buses": 77,
        "lgvs": 950,
        "hgvs": 244,
        "allMotorVehicles": 8783,
        "filterSum": 8783
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.23334927,
          50.70292943
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37674,
        "roadType": "Major",
        "roadName": "A376",
        "startJunction": "M5 Jct 30",
        "endJunction": "M5",
        "pushbikes": 62,
        "motorbikes": 472,
        "cars": 32950,
        "buses": 311,
        "lgvs": 3752,
        "hgvs": 1367,
        "allMotorVehicles": 38852,
        "filterSum": 38852
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.46017848,
          50.7109202
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37683,
        "roadType": "Major",
        "roadName": "A3072",
        "startJunction": "C Road nr Bradley Farm",
        "endJunction": "C Road Coffintree Hill",
        "pushbikes": 0,
        "motorbikes": 49,
        "cars": 1692,
        "buses": 30,
        "lgvs": 394,
        "hgvs": 194,
        "allMotorVehicles": 2359,
        "filterSum": 2359
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.6082314,
          50.815452
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37684,
        "roadType": "Major",
        "roadName": "A3072",
        "startJunction": "A386 Lamerton Cross",
        "endJunction": "A3124 Culm Cross",
        "pushbikes": 9,
        "motorbikes": 9,
        "cars": 533,
        "buses": 4,
        "lgvs": 84,
        "hgvs": 119,
        "allMotorVehicles": 749,
        "filterSum": 749
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.01946848,
          50.78207489
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37685,
        "roadType": "Major",
        "roadName": "A3072",
        "startJunction": "LA Boundary",
        "endJunction": "A388 North Road",
        "pushbikes": 5,
        "motorbikes": 27,
        "cars": 3172,
        "buses": 36,
        "lgvs": 479,
        "hgvs": 205,
        "allMotorVehicles": 3919,
        "filterSum": 3919
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.41490834,
          50.82177325
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37882,
        "roadType": "Major",
        "roadName": "A30",
        "startJunction": "A377",
        "endJunction": "M5 Jct 31",
        "pushbikes": 0,
        "motorbikes": 154,
        "cars": 26297,
        "buses": 100,
        "lgvs": 3618,
        "hgvs": 2650,
        "allMotorVehicles": 32819,
        "filterSum": 32819
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.53023804,
          50.68758301
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 37903,
        "roadType": "Major",
        "roadName": "A38",
        "startJunction": "A379",
        "endJunction": "M5",
        "pushbikes": 2,
        "motorbikes": 389,
        "cars": 36718,
        "buses": 177,
        "lgvs": 5393,
        "hgvs": 3828,
        "allMotorVehicles": 46505,
        "filterSum": 46505
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.52986811,
          50.67621126
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 38110,
        "roadType": "Major",
        "roadName": "A396",
        "startJunction": "A361(T)",
        "endJunction": "B3227",
        "pushbikes": 7,
        "motorbikes": 40,
        "cars": 4073,
        "buses": 34,
        "lgvs": 616,
        "hgvs": 173,
        "allMotorVehicles": 4936,
        "filterSum": 4936
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.49536751,
          50.92617432
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 38180,
        "roadType": "Major",
        "roadName": "A380",
        "startJunction": "C road to Colleywell Bottom",
        "endJunction": "A380 split at Telegraph Hill",
        "pushbikes": 1,
        "motorbikes": 353,
        "cars": 27047,
        "buses": 167,
        "lgvs": 3779,
        "hgvs": 1437,
        "allMotorVehicles": 32783,
        "filterSum": 32783
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.5427482,
          50.63736979
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 38207,
        "roadType": "Major",
        "roadName": "A377",
        "startJunction": "B3226 Fortescue Cross",
        "endJunction": "B3227 Nr Umberleigh",
        "pushbikes": 15,
        "motorbikes": 0,
        "cars": 1490,
        "buses": 7,
        "lgvs": 260,
        "hgvs": 74,
        "allMotorVehicles": 1831,
        "filterSum": 1831
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.92308132,
          50.94626157
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 38383,
        "roadType": "Major",
        "roadName": "A386",
        "startJunction": "A390",
        "endJunction": "B3362",
        "pushbikes": 23,
        "motorbikes": 200,
        "cars": 12184,
        "buses": 94,
        "lgvs": 1381,
        "hgvs": 342,
        "allMotorVehicles": 14201,
        "filterSum": 14201
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.15333105,
          50.54583522
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 38615,
        "roadType": "Major",
        "roadName": "A386",
        "startJunction": "A39(T)",
        "endJunction": "Ferry",
        "pushbikes": 14,
        "motorbikes": 42,
        "cars": 2890,
        "buses": 39,
        "lgvs": 390,
        "hgvs": 94,
        "allMotorVehicles": 3455,
        "filterSum": 3455
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.20152748,
          51.0485999
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 38704,
        "roadType": "Major",
        "roadName": "A3122",
        "startJunction": "A381 Halwell",
        "endJunction": "A3122 North to South spur of triangle",
        "pushbikes": 7,
        "motorbikes": 34,
        "cars": 1397,
        "buses": 7,
        "lgvs": 230,
        "hgvs": 23,
        "allMotorVehicles": 1691,
        "filterSum": 1691
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.7167113,
          50.36566203
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 38705,
        "roadType": "Major",
        "roadName": "A399",
        "startJunction": "A361(T)",
        "endJunction": "A39",
        "pushbikes": 0,
        "motorbikes": 14,
        "cars": 1934,
        "buses": 12,
        "lgvs": 313,
        "hgvs": 192,
        "allMotorVehicles": 2465,
        "filterSum": 2465
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.85637395,
          51.05840759
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 38707,
        "roadType": "Major",
        "roadName": "A361",
        "startJunction": "A39(T)",
        "endJunction": "A399",
        "pushbikes": 0,
        "motorbikes": 105,
        "cars": 10324,
        "buses": 109,
        "lgvs": 1375,
        "hgvs": 1054,
        "allMotorVehicles": 12967,
        "filterSum": 12967
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.99946434,
          51.06737788
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 46326,
        "roadType": "Major",
        "roadName": "A35",
        "startJunction": "A373 Dowell Street",
        "endJunction": "Monkton Road/King's Road jct",
        "pushbikes": 63,
        "motorbikes": 107,
        "cars": 10396,
        "buses": 113,
        "lgvs": 1371,
        "hgvs": 207,
        "allMotorVehicles": 12194,
        "filterSum": 12194
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.18765789,
          50.80007882
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 46416,
        "roadType": "Major",
        "roadName": "A38",
        "startJunction": "A383",
        "endJunction": "A382 Newton Road",
        "pushbikes": 0,
        "motorbikes": 333,
        "cars": 23280,
        "buses": 188,
        "lgvs": 3834,
        "hgvs": 2662,
        "allMotorVehicles": 30297,
        "filterSum": 30297
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.69492241,
          50.54316907
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 46417,
        "roadType": "Major",
        "roadName": "A38",
        "startJunction": "A3121",
        "endJunction": "B3372",
        "pushbikes": 10,
        "motorbikes": 219,
        "cars": 30075,
        "buses": 220,
        "lgvs": 5002,
        "hgvs": 2842,
        "allMotorVehicles": 38358,
        "filterSum": 38358
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.84786838,
          50.41110398
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 46425,
        "roadType": "Major",
        "roadName": "A39",
        "startJunction": "A399",
        "endJunction": "B3223",
        "pushbikes": 6,
        "motorbikes": 16,
        "cars": 2146,
        "buses": 52,
        "lgvs": 267,
        "hgvs": 59,
        "allMotorVehicles": 2540,
        "filterSum": 2540
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.8625042,
          51.21096678
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 47039,
        "roadType": "Major",
        "roadName": "A373",
        "startJunction": "M5 Jct 28",
        "endJunction": "A35 Honiton High Street",
        "pushbikes": 1,
        "motorbikes": 45,
        "cars": 2423,
        "buses": 32,
        "lgvs": 510,
        "hgvs": 167,
        "allMotorVehicles": 3177,
        "filterSum": 3177
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.27908217,
          50.82222391
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 47042,
        "roadType": "Major",
        "roadName": "A377",
        "startJunction": "A3072 Mill Street",
        "endJunction": "A3072 Copplestone",
        "pushbikes": 9,
        "motorbikes": 115,
        "cars": 7462,
        "buses": 39,
        "lgvs": 1034,
        "hgvs": 398,
        "allMotorVehicles": 9048,
        "filterSum": 9048
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.70420461,
          50.80013145
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 47048,
        "roadType": "Major",
        "roadName": "A379",
        "startJunction": "Ferry",
        "endJunction": "B3205 Slappers Hill",
        "pushbikes": 17,
        "motorbikes": 40,
        "cars": 1767,
        "buses": 4,
        "lgvs": 281,
        "hgvs": 36,
        "allMotorVehicles": 2128,
        "filterSum": 2128
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.54814135,
          50.37063708
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 47049,
        "roadType": "Major",
        "roadName": "A379",
        "startJunction": "C Road Red Lion Hill",
        "endJunction": "A3121",
        "pushbikes": 7,
        "motorbikes": 63,
        "cars": 4732,
        "buses": 73,
        "lgvs": 659,
        "hgvs": 222,
        "allMotorVehicles": 5749,
        "filterSum": 5749
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.96924276,
          50.35185497
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 47053,
        "roadType": "Major",
        "roadName": "A381",
        "startJunction": "C Road Field Study Centre",
        "endJunction": "A3122 Totnes Cross",
        "pushbikes": 3,
        "motorbikes": 37,
        "cars": 4611,
        "buses": 36,
        "lgvs": 668,
        "hgvs": 301,
        "allMotorVehicles": 5653,
        "filterSum": 5653
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.74237257,
          50.3368592
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 47055,
        "roadType": "Major",
        "roadName": "A384",
        "startJunction": "C road to Staverton",
        "endJunction": "A385",
        "pushbikes": 27,
        "motorbikes": 125,
        "cars": 7747,
        "buses": 80,
        "lgvs": 912,
        "hgvs": 373,
        "allMotorVehicles": 9237,
        "filterSum": 9237
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -3.71996385,
          50.45555305
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 47058,
        "roadType": "Major",
        "roadName": "A386",
        "startJunction": "A3072",
        "endJunction": "A3124",
        "pushbikes": 0,
        "motorbikes": 26,
        "cars": 1335,
        "buses": 34,
        "lgvs": 333,
        "hgvs": 172,
        "allMotorVehicles": 1900,
        "filterSum": 1900
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.13506416,
          50.91222319
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "pointId": 47059,
        "roadType": "Major",
        "roadName": "A386",
        "startJunction": "A30 slip",
        "endJunction": "A3079",
        "pushbikes": 0,
        "motorbikes": 23,
        "cars": 1811,
        "buses": 10,
        "lgvs": 354,
        "hgvs": 428,
        "allMotorVehicles": 2626,
        "filterSum": 2626
      },
      "geometry": {
        "type": "Point",
        "coordinates": [
          -4.05486646,
          50.71580181
        ]
      }
    }
  ]
}