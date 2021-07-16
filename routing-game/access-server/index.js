require("dotenv").config();
const axios = require("axios").default;
const express = require("express");
const app = express();
const port = process.env.PORT;

app.get("/", async (req, res) => {
	try {
		let result = await axios.get(process.env.API);
		return res.json(result.data);
	} catch (error) {
		res.status(400).json({ success: false, error: { message: error } });
	}
});

app.listen(port, () => {
	console.log("App is listen on port", port);
});
