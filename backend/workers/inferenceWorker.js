const { spawn } = require('child_process');
const Scan = require('../models/Scan');
const Model = require('../models/Model');
const path = require('path');

async function runInference(scan) {
  // Fetch active model from DB
  const activeModel = await Model.findOne({ status: "Active" }).sort({ deployedDate: -1 });
  if (!activeModel) throw new Error("No active model found");

  // Full paths
  const scanFilePath = path.resolve(scan.filePath);
  const modelFilePath = path.resolve(activeModel.filePath);

  return new Promise((resolve, reject) => {
  let output = '';
  let errorOutput = '';

  const pyProcess = spawn('python', [
    path.resolve(__dirname, '../python/inference.py'),
    scanFilePath,
    modelFilePath,
  ]);

  pyProcess.stdout.on('data', (data) => {
    const text = data.toString();
    console.log("Python stdout:", text);  // <-- log what python prints
    output += text;
  });

  pyProcess.stderr.on('data', (data) => {
    const errText = data.toString();
    console.error('Python error:', errText);
    errorOutput += errText;
  });

  pyProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
    if (code !== 0) {
      reject(new Error(`Python exited with code ${code}. Stderr: ${errorOutput}`));
    } else {
      try {
        console.log("Raw output from Python:", output); // <-- check raw output here
        const results = JSON.parse(output);
        console.log("Parsed results:", results);  // <-- check parsed results here
        resolve(results);
      } catch (e) {
        console.error("JSON parse error:", e);
        reject(e);
      }
    }
  });
});
}

async function processScanQueue() {
  const scan = await Scan.findOne({ status: "Queued" });
  if (!scan) return;

  try {
    scan.status = "Processing";
    scan.startedAt = new Date(); // optional: track start
    await scan.save();

    const results = await runInference(scan);
    console.log(`Scan ${scan._id} predictions:`, results);

    scan.results = results;
    scan.status = "Completed";
    scan.completedAt = new Date(); // ✅ add this line
    await scan.save();

    console.log(`Processed scan ${scan._id} successfully.`);
  } catch (err) {
    console.error(`Failed to process scan ${scan._id}`, err);
    scan.status = "Failed";
    await scan.save();
  }
}


// Export function to call from a scheduler or trigger
module.exports = { processScanQueue };
