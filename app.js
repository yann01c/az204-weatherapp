const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");

const WEATHER_API_KEY = "43ec2481a55940206853902b87d623bd";

async function getCoordinates(city, country) {
    const geoApiUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${city},${country}&limit=1&appid=${WEATHER_API_KEY}`;

    try {
        const response = await axios.get(geoApiUrl);
        if (response.data.length > 0) {
            return {
                lat: response.data[0].lat,
                lon: response.data[0].lon,
            };
        } else {
            throw new Error(`No coordinates found for ${city}, ${country}`);
        }
    } catch (error) {
        console.error("Error fetching coordinates:", error.message);
        throw error;
    }
}

app.get("/", async (req, res) => {
    const city = "Bern";
    const country = "CH";

    try {
        const { lat, lon } = await getCoordinates(city, country);

        const weatherApiUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&lang=de&units=metric&appid=${WEATHER_API_KEY}`;
        const weatherResponse = await axios.get(weatherApiUrl);

        const weatherData = weatherResponse.data;

        res.render("index", {
            city: city,
            currentTemp: weatherData.current.temp,
            currentWeather: weatherData.current.weather[0].description,
            icon: `https://openweathermap.org/img/wn/${weatherData.current.weather[0].icon}.png`,
            dailyForecast: weatherData.daily.slice(0, 3),
        });
    } catch (error) {
        console.error("Error fetching weather data:", error.message);
        res.status(500).send("Error fetching weather data");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
