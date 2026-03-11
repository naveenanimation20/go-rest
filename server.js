const app = require("./api/index");

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 NAL Mock API running at http://localhost:${PORT}`);
  console.log(`📋 Docs: http://localhost:${PORT}/`);
  console.log(`👥 Users: http://localhost:${PORT}/public/v2/users\n`);
});
