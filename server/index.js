const app = require('./app');

const PORT = process.env.PORT || 11001;

app.listen(PORT, () => {
  console.log(`Cross Trainer API running on http://localhost:${PORT}`);
});
