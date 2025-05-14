const express = require('express');
const cors = require('cors');
require('dotenv').config()

const app = express();
const PORT = process.env.PORT;

const corsOptions = require('./config/cors-options');
const credentials = require('./config/cors-credentials');
app.use(credentials);
app.use(cors(corsOptions));

const bodyParser = require('body-parser');
app.use(bodyParser.json({limit: '10mb'}));

app.post('/signup', require('./requests/post/signup').Signup)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));