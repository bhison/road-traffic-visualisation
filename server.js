const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.static(__dirname + '/dist'));

app.get('/', (req,res) => {
  res.sendFile(__dirname + '/dist/index.html');
});

app.listen(port, '0.0.0.0', function(err){
  if(err) {
    return console.log('bad thing', err);
  }
  console.log(`Server listening on ${port}`);
});