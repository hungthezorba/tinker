import express from 'express';
var AWS = require('aws-sdk');
const axios = require('axios');
const app = express();
const port = 6000;

let myConfig = new AWS.Config();
var credential = new AWS.SharedIniFileCredentials({profile: 'default'});
AWS.config.credentials = credential;
myConfig.update({
  "region": "us-east-2",
  "credentitals": {
      "accessKeyId": process.env.ACCESS_KEY_ID,
      "secretAccessKey": process.env.SECRET_ACCESS_KEY,
  },
  "endpoint": "https://dynamodb.us-east-2.amazonaws.com"
})

const dynamodb = new AWS.DynamoDB.DocumentClient(myConfig);
const dynamodbTableName = 'covidHistory_Prod';

type historyData = {
    Items: [],
    Count: Number,
    ScannedCount: Number
}

function computeDaysBetween(day: string) {
  return Math.floor((Date.now() - Date.parse(day)) / 86400000);
}

function sleep(ms: number) {
  return new Promise<void>((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}

type GetCountry = {
  country: string,
  location: string
}

async function scan(params: any, array: GetCountry[]): Promise<GetCountry[]> {

  let data = await dynamodb.scan(params).promise();
  array = array.concat(data.Items);  
  if (data.LastEvaluatedKey) {
    params.ExclusiveStartKey = data.LastEvaluatedKey;
    return await scan(params, array);
  }
  return array;
}

async function getCountry() {
  const params = {
    TableName: dynamodbTableName,
    ProjectionExpression: "#c, #l",
    ExpressionAttributeNames: {
      "#c" : "country",
      "#l" : "location"
    },
  }
  let array:GetCountry[] = [];
  const allCountries = await scan(params, array);
  return allCountries
}

async function updateRecords(continent: string) {
  try {
    axios.get('https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/owid-covid-data.json')
    .then((res:any) => {
      for (let item in res.data) {
        if (res.data[item].continent === continent) {
          let modifyData = []
          let rawData = res.data[item].data

          // lastDayStats
          let lastTotalCases = 0;
          let lastTotalTests = 0;
          let lastTotalVaccinations = 0;
          let lastTotalDeaths = 0;
          
          for (let i = rawData.length - 1; i >= 0; i--) {
            if(computeDaysBetween(rawData[i].date) <= 90) {
              let obj;
              try {
                obj = {
                  date: rawData[i].date,
                  totalCases: (!isNaN(rawData[i]['total_cases']) && rawData[i].total_cases != null) ? parseInt(rawData[i].total_cases) : 0,
                  newCases: (!isNaN(rawData[i]['new_cases']) && rawData[i].new_cases != null) ? parseInt(rawData[i].new_cases) : 0,
                  totalDeaths: (!isNaN(rawData[i]['total_deaths']) && rawData[i].total_deaths != null) ? parseInt(rawData[i].total_deaths) : 0,
                  newDeaths: (!isNaN(rawData[i]['new_deaths']) && rawData[i].new_deaths != null) ? parseInt(rawData[i].new_deaths) : 0,
                  totalTests: (!isNaN(rawData[i]['total_tests']) && rawData[i].total_tests!= null) ? parseInt(rawData[i].total_tests) : 0,
                  newTests: (!isNaN(rawData[i]['new_tests']) && rawData[i].new_tests != null) ? parseInt(rawData[i].new_tests) : 0,
                  totalVaccinations: (!isNaN(rawData[i]['total_vaccinations']) && rawData[i].total_vaccinations != null) ? parseInt(rawData[i].total_vaccinations) : 0,
                  newVaccinations: (!isNaN(rawData[i]['new_vaccinations']) && rawData[i].new_vaccinations != null) ? parseInt(rawData[i].new_vaccinations) : 0,
                }
              } catch (err) {
                console.log(err);
              }
              modifyData.push(obj)
            } else {
              break;
            }
          }
          if (modifyData.length != 0) {
            let params = {
              TableName: dynamodbTableName,
              Item: {
                data: modifyData.reverse(),
                country: item,
                location: res.data[item].location?  res.data[item].location : null,
                continent: res.data[item].continent? res.data[item].continent : null
              }
            }
            try {
              dynamodb.put(params, (err: any) => {
                if (err) {
                  console.error(params.Item.data);
                }
              })
            } catch(err) {
              console.log(err); 
            }
  
          }
          sleep(2000);
        }
      }
      
    })
  } catch(error) {
    console.error('Do your custom error handling hre. I am just gonna log it: ', error);
  }
  return 
}

async function getHistoryData(country: string) {
  const params = {
    TableName: dynamodbTableName,
    KeyConditionExpression: 'country = :country',
    ExpressionAttributeValues: {
      ':country': country
    }
  }
  return await dynamodb.query(params).promise().then((response: any) => {    
    console.log(response.Items);
    
    return response.Items
  }, (error: any) => {
    console.error(error); 
  })
}

app.get('/', async (req, res) => {
  getHistoryData('JEY').then((response) => {
    res.send(response);
  })
});

app.get('/history/countries', async(req, res) => {
  getCountry().then((response) => {
    res.send(response);
  })
})

app.put('/history', async (req, res) => {
  updateRecords("Africa").then(() => {
    res.send('OK');
  });
  // res.status(200).send(String(computeDaysBetween("2021-05-15")));
})

app.listen(port, () => {
  return console.log(`server is listening on ${port}`);
});