require("dotenv").config();
const axios = require("axios").default;
const express = require("express");
const app = express();
const port = process.env.PORT;

app.get("/", async (req, res) => {
	try {
		let result = await axios.get(
			"https://api.covidtracking.com/v1/states/current.json"
		);
		return res.json(
			result
				? { success: true, result: result.data }
				: { success: false, error: "API not found" }
		);
	} catch (error) {
		res.status(400).json({ success: false, error: { message: error } });
	}
});

app.listen(port, () => {
	console.log("App is listen on port", port);
});
