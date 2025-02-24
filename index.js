const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Use the STT routes
const sttRoutes = require('./routes/stt');
app.use('/stt', sttRoutes);

// Use the STT Batch routes
const sttBatchRoutes = require('./routes/stt_batch');
app.use('/stt_batch', sttBatchRoutes);

// Use the calendar routes
const calendarRoutes = require('./routes/calendar');
app.use('/calendar', calendarRoutes);

// Redirect root to /stt
app.get('/', (req, res) => {
  res.redirect('/stt');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
