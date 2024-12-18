const express = require("express");
const axios = require("axios");
const { CosmosClient } = require("@azure/cosmos");
const { Template } = require("ejs");

require('dotenv').config();

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
const client = new CosmosClient(connectionString);

const databaseID = "cosmosweather";
const containerID = "CTemp1";

const container = client.database(databaseID).container(containerID);

// async function setupDatabase() {
//     const { database } = await client.databases.createIfNotExists({ id: databaseID });
//     console.log(`Database created: ${database.id}`);

//     const { container } = await database.containers.createIfNotExists({
//         id: containerID,
//         partitionKey: { paths: ["/weather"] }, // Replace with your partition key
//     });
//     console.log(`Container created: ${container.id}`);
// }

// setupDatabase().catch(console.error);

//////////////////////////////////////////////////////////////////////////////////
async function saveWeatherData(weatherData) {
    try {
        const response = await container.items.create(weatherData);
        console.log("Weather data saved:", response.resource);
    } catch (err) {
        console.error("Error saving data to Cosmos DB:", err);
    }
}

async function queryTemps() {

    try {
        console.log(`Querying locations from container: ${containerID}`);
        
        const querySpec = {
            query: "SELECT DISTINCT CTemp1.temp FROM CTemp1 WHERE CTemp1.temp < 1"
        };

        // Execute the query
        const { resources } = await container.items.query(querySpec).fetchAll();

        let temps = [];

        console.log("Temps:");
        resources.forEach((item) => {
            console.log(item);
            temps.push(item)
        });

        console.log("Temps in my Var: ", temps)

        return resources.map(item => item); // Return only the locations
    } catch (err) {
        console.error("Error querying locations from Cosmos DB:", err.message);
    }
}
//////////////////////////////////////////////////////////////////////////////////

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

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

        const weatherApiUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&lang=en&units=metric&appid=${WEATHER_API_KEY}`;
        const weatherResponse = await axios.get(weatherApiUrl);

        const weatherData = weatherResponse.data;

        const cosmosData = {
            temp: weatherData.current.temp
        }

        var getTemps = await queryTemps()
        console.log("Temps from Func: ",getTemps);

        saveWeatherData(cosmosData);

        res.render("index", {
            city: city,
            currentTemp: weatherData.current.temp,
            currentWeather: weatherData.current.weather[0].description,
            icon: `https://openweathermap.org/img/wn/${weatherData.current.weather[0].icon}.png`,
            dailyForecast: weatherData.daily.slice(0, 3),
            dbTemps: getTemps
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
