const path = require("path");
const fs = require("fs");
const filename = path.basename(
  "C:\\Users\\abhi7\\SpinTrip_Backend\\Controller\\locationData.json"
);
exports.gpsLocation = async (req, res) => {
  console.log(req.body);
  const locationData = req.body;

  fs.writeFile(filename, JSON.stringify(locationData, null, 2), (err) => {
    if (err) {
      console.error("Error writing to file:", err);
      return res.status(500).json({ error: "Failed to save data" });
    }
    res.status(200).json({ message: "Data saved successfully" });
  });
};
