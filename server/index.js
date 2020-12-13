require('log-prefix')(() => `[${require('dayjs')().format('DD/MM/YYYY hh:mm:ss.SSS (Z)')}]`); // Insere data nos logs

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

const PORT = process.env.PORT || 3030;

app.use(cors());
app.use(bodyParser.json());

app.use('/api', require('./controllers'));

app.listen(PORT, () => {
    console.log('Listening on port '+PORT);
});
