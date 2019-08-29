import "../css/main.css";
import { data } from '../data/data.json';

mapboxgl.accessToken = 'pk.eyJ1IjoiYmhpc29uIiwiYSI6ImNqcDc5a2xlaTEwNmwza28zMDFvYWl1YnkifQ.9KB2DoGG7y7QBd93uBbWFw';

var map = window.map = new mapboxgl.Map({
  container: 'map',
  zoom: 12,
  center: [-3.5485669, 50.724423],
  style: 'mapbox://styles/bhison/cjzx4fu180ehk1crs3kl0eis1',
});

/*
const data =
  response.data.map(d => {
    latitude: d.latitude;
    longitude: d.longitude;
    roadType: d.road_type;
    roadName: d.road_name;
    startJunction: d.start_junction_road_name;
    endJunction: d.end_junction_road_name;
    counts: {
      pushbikes: d.pedal_cycles;
      motorbikes: d.two_wheeled_motor_vehicles;
      cars: d.cars_and_taxis;
      buses: d.buses_and_coaches;
      lgvs: d.lgvs;
      hgvs: d.all_hgvs;
      alllMotorVehicles: d.all_motor_vehicles;
    }
  });
*/
