// Third-party
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
// Project
import * as query from './queries';

const app = express();
app.use(bodyParser.json({ limit: '50mb' })); // Allows getting req.body.{jsonparam} in POST
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Run Server
const SERVER_PORT = 4000;
app.listen(SERVER_PORT, () => {
  console.log(`Server Running on http://localhost:${SERVER_PORT} ...`);
});

// JSON query test
app.get('/api/status', (req, res) => {
  res.send({
    message: 'Server Running Fine :D',
  });
});

app.post('/api/generatePCB', query.generateSchematic);
